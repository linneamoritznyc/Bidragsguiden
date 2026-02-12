import { createClient } from "@supabase/supabase-js";

// --- Supabase admin client (server-side, uses service role for usage tracking) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SECURITY: Only use the service role key (bypasses RLS for server-side writes to bg_usage).
// If not configured, usage tracking is disabled but requests still work.
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// --- Daily limits ---
const FREE_DAILY_LIMIT = 3;        // Anonymous users: 3 searches/day
const LOGGED_IN_DAILY_LIMIT = 5;   // Logged-in users: 5 searches/day
const PREMIUM_DAILY_LIMIT = 100;   // Premium: effectively unlimited

// --- In-memory rate limiting (burst protection, resets on deploy) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

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

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW * 5);

// --- Check daily usage and record new usage ---
async function checkAndRecordUsage({ sessionId, userId, ip }) {
  if (!supabaseAdmin) {
    // Supabase not configured — allow request but can't track
    return { allowed: true, used: 0, limit: FREE_DAILY_LIMIT };
  }

  // Determine limit based on user type
  // TODO: Add premium check when Stripe is integrated
  const limit = userId ? LOGGED_IN_DAILY_LIMIT : FREE_DAILY_LIMIT;

  // Count today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let query = supabaseAdmin
    .from("bg_usage")
    .select("id", { count: "exact", head: true })
    .gte("used_at", today.toISOString());

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (sessionId) {
    query = query.eq("session_id", sessionId);
  } else {
    query = query.eq("ip_address", ip);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Usage check error:", error);
    // On error, allow the request (fail open)
    return { allowed: true, used: 0, limit };
  }

  const used = count || 0;

  if (used >= limit) {
    return { allowed: false, used, limit };
  }

  // Record this usage
  await supabaseAdmin.from("bg_usage").insert({
    session_id: sessionId || null,
    user_id: userId || null,
    ip_address: ip,
  });

  return { allowed: true, used: used + 1, limit };
}

// --- Anthropic API call with retry ---
async function callAnthropicWithRetry(apiKey, prompt, { retries = 2, maxTokens = 4000 } = {}) {
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
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.status === 529 || response.status === 503) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }

      if (response.status === 429) {
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

// --- Main handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // Rate limit by IP (burst protection)
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "För många förfrågningar. Vänta en minut och försök igen.",
    });
  }

  const { prompt, sessionId, userId, quickQuestion } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  if (prompt.length > 10000) {
    return res.status(400).json({ error: "Prompt too long" });
  }

  // Validate sessionId and userId format (must be UUID if provided)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (sessionId && !uuidRegex.test(sessionId)) {
    return res.status(400).json({ error: "Invalid session ID" });
  }
  if (userId && !uuidRegex.test(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  // Quick questions (per-grant Q&A) skip usage tracking but still rate-limit
  if (quickQuestion) {
    try {
      const result = await callAnthropicWithRetry(apiKey, prompt, { maxTokens: 500 });

      if (result.error) {
        return res.status(result.status || 500).json({ error: "AI service error" });
      }

      return res.status(200).json(result.data);
    } catch (err) {
      console.error("Quick question error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Check daily usage limit (full searches only)
  const usage = await checkAndRecordUsage({ sessionId, userId, ip });

  if (!usage.allowed) {
    return res.status(429).json({
      error: "daily_limit",
      message: userId
        ? `Du har använt dina ${usage.limit} gratis-sökningar idag. Uppgradera till Premium för obegränsad tillgång.`
        : `Du har använt dina ${usage.limit} gratis-sökningar idag. Logga in för fler sökningar, eller kom tillbaka imorgon.`,
      used: usage.used,
      limit: usage.limit,
      loggedIn: !!userId,
    });
  }

  try {
    const result = await callAnthropicWithRetry(apiKey, prompt);

    if (result.error) {
      return res.status(result.status || 500).json({ error: "AI service error" });
    }

    // Include usage info in response
    res.status(200).json({
      ...result.data,
      _usage: { used: usage.used, limit: usage.limit },
    });
  } catch (err) {
    console.error("API route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
