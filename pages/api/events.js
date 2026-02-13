import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

async function callAnthropic(apiKey, prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic API error:", response.status, errorText);
    return null;
  }

  return await response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { userId, region, industry, needs } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  const regionText = region || "hela Sverige";
  const industryText = Array.isArray(industry) ? industry.join(", ") : (industry || "blandad bransch");
  const needsText = Array.isArray(needs) ? needs.join(", ") : (needs || "allmänt företagsstöd");

  const prompt = `Du är en expert på svenska företagsevenemang och nätverksmöjligheter.

Baserat på följande företagsprofil, rekommendera 6-10 relevanta kommande evenemang, nätverksträffar, seminarier, och informationstillfällen som kan vara värdefulla.

FÖRETAGSPROFIL:
- Region: ${regionText}
- Bransch: ${industryText}
- Behov: ${needsText}

VIKTIGA EVENEMANGSKÄLLOR ATT SÖKA BLAND:
- Vinnova: Innovationsdagar, Startup-evenemang, öppna informationstillfällen om utlysningar
- Tillväxtverket: Regionala konferenser, webbinarier om EU-fonder, informationsträffar
- Almi: Företagarfrukostar, mentorskapsprogram, regionala nätverksträffar
- NyföretagarCentrum: Starta eget-seminarier, rådgivningsevenemang
- SISP (Swedish Incubators & Science Parks): Demo days, pitch events
- Connect Sverige: Investerarträffar, pitchtävlingar
- Svenskt Näringsliv: Branschträffar, företagarkvällar
- Handelskammare: Internationella handelsevenemang, exportrådgivning
- Länsstyrelser och Regioner: Regionala utvecklingskonferenser
- Arbetsförmedlingen: Informationsträffar om starta-eget-bidrag
- Business Sweden: Exportevenemang, internationalisering
- EU SME Support: Webbinarier om EU-finansiering

Datumet idag är ${new Date().toISOString().slice(0, 10)}.
Generera realistiska evenemang som troligtvis sker under 2026.
Om du inte vet exakt datum, ge ungefärliga datum (t.ex. mars 2026).

VIKTIGT: Använd INGA emojis.
Svara ENBART med giltig JSON i detta format:
{
  "events": [
    {
      "title": "Namn på evenemanget",
      "organizer": "Arrangör (t.ex. Vinnova, Almi Väst)",
      "date": "YYYY-MM-DD (ungefärligt datum)",
      "location": "Stad eller 'Online'",
      "url": "Officiell URL om känd, annars arrangörens hemsida",
      "description": "Kort beskrivning (1-2 meningar)",
      "source": "Organisationen som står bakom",
      "event_type": "networking/seminar/workshop/conference/webinar/pitch"
    }
  ]
}`;

  try {
    const result = await callAnthropic(apiKey, prompt);
    if (!result) {
      return res.status(500).json({ error: "AI request failed" });
    }

    const text = result.content
      .map((item) => (item.type === "text" ? item.text : ""))
      .filter(Boolean)
      .join("\n");

    const clean = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({ error: "Could not parse AI response" });
      }
    }

    if (!parsed?.events || !Array.isArray(parsed.events)) {
      return res.status(500).json({ error: "Invalid response format" });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Events API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
