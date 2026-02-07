// Simple in-memory rate limiting per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW * 5);

async function callAnthropicWithRetry(apiKey, prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.status === 529 || response.status === 503) {
        // Overloaded or unavailable — retry with backoff
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }

      if (response.status === 429) {
        // Rate limited by Anthropic — retry once with longer delay
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Anthropic API error (attempt ${attempt + 1}):`, response.status, errorText);
        return { error: true, status: response.status };
      }

      return { error: false, data: await response.json() };
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // Rate limit by IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.socket?.remoteAddress
    || "unknown";

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "För många förfrågningar. Vänta en minut och försök igen.",
    });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  // Limit prompt size to prevent abuse
  if (prompt.length > 10000) {
    return res.status(400).json({ error: "Prompt too long" });
  }

  try {
    const result = await callAnthropicWithRetry(apiKey, prompt);

    if (result.error) {
      return res.status(result.status || 500).json({ error: "AI service error" });
    }

    res.status(200).json(result.data);
  } catch (err) {
    console.error("API route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
