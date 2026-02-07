import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { QUIZ_CATEGORIES } from "../components/questions";

const LoadingDots = () => {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <span style={{ display: "inline-block", width: 30, textAlign: "left" }}>
      {".".repeat(dots)}
    </span>
  );
};

// Single grant card with eligibility toggle and feedback
function GrantCard({ benefit, index, feedback, onFeedbackChange }) {
  const [expanded, setExpanded] = useState(false);
  const [reasonInput, setReasonInput] = useState(feedback?.reason || "");

  const priorityColors = {
    high: { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)", text: "#10b981", label: "Hög" },
    medium: { bg: "rgba(96, 165, 250, 0.15)", border: "rgba(96, 165, 250, 0.4)", text: "#60a5fa", label: "Medium" },
    low: { bg: "rgba(148, 163, 184, 0.1)", border: "rgba(148, 163, 184, 0.3)", text: "#94a3b8", label: "Låg" },
  };
  const p = priorityColors[benefit.priority] || priorityColors.medium;

  const eligibility = feedback?.eligible; // "yes", "no", or undefined

  const cardBorder = eligibility === "no"
    ? "rgba(239, 68, 68, 0.3)"
    : eligibility === "yes"
      ? "rgba(16, 185, 129, 0.4)"
      : p.border;

  const cardOpacity = eligibility === "no" ? 0.6 : 1;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 14, padding: "20px",
      marginBottom: 12, borderLeft: `3px solid ${cardBorder}`,
      opacity: cardOpacity,
      transition: "all 0.3s ease",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8,
      }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>{benefit.name}</h4>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {benefit.category && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#64748b",
              background: "rgba(255,255,255,0.05)", padding: "3px 8px",
              borderRadius: 12, textTransform: "uppercase", letterSpacing: "0.5px",
            }}>{benefit.category}</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 600, color: p.text,
            background: p.bg, padding: "3px 8px", borderRadius: 12,
            border: `1px solid ${p.border}`,
          }}>{p.label}</span>
        </div>
      </div>

      {/* Agency */}
      <p style={{ fontSize: 12, color: "#38bdf8", margin: "0 0 8px", fontWeight: 500 }}>
        {benefit.agency}
      </p>

      {/* Description */}
      <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
        {benefit.description}
      </p>

      {/* Info grid - deadline, amount, docs */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, marginBottom: 12,
      }}>
        {benefit.amount && (
          <div style={{
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.1)",
          }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Belopp</div>
            <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>{benefit.amount}</div>
          </div>
        )}
        {benefit.deadline && (
          <div style={{
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(251, 191, 36, 0.06)",
            border: "1px solid rgba(251, 191, 36, 0.1)",
          }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Deadline</div>
            <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>{benefit.deadline}</div>
          </div>
        )}
      </div>

      {/* Eligibility requirements */}
      {benefit.eligibility_summary && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12,
          background: "rgba(56, 189, 248, 0.04)",
          border: "1px solid rgba(56, 189, 248, 0.1)",
        }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
            Vem kan söka
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
            {benefit.eligibility_summary}
          </div>
        </div>
      )}

      {/* Required documents */}
      {benefit.required_docs && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
            Dokument som behövs
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
            {benefit.required_docs}
          </div>
        </div>
      )}

      {/* How to apply */}
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
        📝 {benefit.how_to_apply}
      </p>

      {/* Link */}
      {benefit.url && (
        <a href={benefit.url} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", fontSize: 13, color: "#38bdf8",
          textDecoration: "none", fontWeight: 500, marginBottom: 16,
        }}>Läs mer på {benefit.agency} →</a>
      )}

      {/* Eligible / Not Eligible buttons */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: 12, marginTop: 4,
      }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Stämmer detta för dig?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onFeedbackChange(index, { eligible: eligibility === "yes" ? undefined : "yes", reason: "" })}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              background: eligibility === "yes" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.04)",
              color: eligibility === "yes" ? "#10b981" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            ✓ Kan vara aktuellt
          </button>
          <button
            onClick={() => {
              if (eligibility === "no") {
                onFeedbackChange(index, { eligible: undefined, reason: "" });
                setReasonInput("");
              } else {
                onFeedbackChange(index, { eligible: "no", reason: reasonInput });
                setExpanded(true);
              }
            }}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              background: eligibility === "no" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.04)",
              color: eligibility === "no" ? "#ef4444" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            ✗ Inte aktuellt
          </button>
        </div>

        {/* Reason input - shown when marked as not eligible */}
        {eligibility === "no" && expanded && (
          <div style={{ marginTop: 10, animation: "fadeSlide 0.3s ease" }}>
            <textarea
              value={reasonInput}
              onChange={(e) => {
                setReasonInput(e.target.value);
                onFeedbackChange(index, { eligible: "no", reason: e.target.value });
              }}
              placeholder="Valfritt: Varför passar det inte? T.ex. 'Vi har för få anställda' eller 'Vi är inte i rätt län'"
              style={{
                width: "100%", minHeight: 60, padding: "10px 12px",
                borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)", color: "#cbd5e1",
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                resize: "vertical", lineHeight: 1.4,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}


export default function Home() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [multiSelect, setMultiSelect] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [infoPanel, setInfoPanel] = useState(null);
  const [feedback, setFeedback] = useState({}); // { index: { eligible: "yes"/"no", reason: "..." } }
  const [refineCount, setRefineCount] = useState(0);
  const [refining, setRefining] = useState(false);
  const resultRef = useRef(null);

  const categories = QUIZ_CATEGORIES;

  const transition = (callback) => {
    setFadeIn(false);
    setTimeout(() => {
      callback();
      setFadeIn(true);
    }, 300);
  };

  const handleSingleSelect = (categoryId, value) => {
    const newAnswers = { ...answers, [categoryId]: value };
    setAnswers(newAnswers);
    if (step < categories.length - 1) {
      transition(() => setStep(step + 1));
    } else {
      fetchResults(newAnswers);
    }
  };

  const handleMultiConfirm = (categoryId) => {
    const newAnswers = { ...answers, [categoryId]: multiSelect };
    setAnswers(newAnswers);
    setMultiSelect([]);
    if (step < categories.length - 1) {
      transition(() => setStep(step + 1));
    } else {
      fetchResults(newAnswers);
    }
  };

  const toggleMulti = (value) => {
    setMultiSelect((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleFeedbackChange = (index, value) => {
    setFeedback((prev) => ({ ...prev, [index]: value }));
  };

  const buildPrompt = (finalAnswers) => {
    const companyTypeMap = {
      enskild_firma: "enskild firma",
      handelsbolag: "handelsbolag (HB)",
      kommanditbolag: "kommanditbolag (KB)",
      aktiebolag: "aktiebolag (AB)",
      ekonomisk_forening: "ekonomisk förening",
      ideell_forening: "ideell förening",
      planning: "planerar att starta företag",
    };
    const employeesMap = {
      solo: "0 anställda (soloföretagare)",
      micro: "1-9 anställda (mikroföretag)",
      small: "10-49 anställda (litet företag)",
      medium: "50-249 anställda (medelstort företag)",
      large: "250+ anställda (stort företag)",
    };
    const regionMap = {
      stockholm: "Stockholms län", vastra_gotaland: "Västra Götalands län",
      skane: "Skåne län", ostergotland: "Östergötlands län",
      uppsala: "Uppsala län", jonkoping: "Jönköpings län",
      halland: "Hallands län", orebro: "Örebro län",
      sodermanland: "Södermanlands län", dalarna: "Dalarnas län",
      gavleborg: "Gävleborgs län", varmland: "Värmlands län",
      vastmanland: "Västmanlands län", norrbotten: "Norrbottens län",
      vasterbotten: "Västerbottens län", vasternorrland: "Västernorrlands län",
      jamtland: "Jämtlands län", kalmar: "Kalmar län",
      kronoberg: "Kronobergs län", blekinge: "Blekinge län",
      gotland: "Gotlands län",
    };
    const needsMap = {
      investment: "investering i verksamheten",
      product_dev: "produktutveckling",
      export: "export/internationalisering",
      digitalization: "digitalisering",
      sustainability: "hållbarhet/klimatomställning",
      hiring_skills: "anställa personal/kompetensutveckling",
      startup_support: "starta eget-stöd",
      rnd: "forskning & innovation",
    };
    const revenueMap = {
      zero: "ingen omsättning ännu",
      under_500k: "under 500 000 kr",
      "500k_3m": "500 000 - 3 mkr",
      "3m_10m": "3-10 mkr",
      "10m_50m": "10-50 mkr",
      over_50m: "över 50 mkr",
    };
    const industryMap = {
      tech: "Tech/IT/SaaS", ecommerce: "Handel/E-commerce",
      manufacturing: "Tillverkning/Industri", construction: "Bygg/Fastighet",
      hospitality: "Restaurang/Besöksnäring", health: "Hälsa/Vård/Life Science",
      transport: "Transport/Logistik", consulting: "Konsult/Tjänsteföretag",
      creative: "Kreativa branschen/Kultur", agriculture: "Jordbruk/Livsmedel",
      energy: "Energi/Cleantech", education: "Utbildning",
      other: "Annan/blandad bransch",
    };

    const needs = Array.isArray(finalAnswers.needs)
      ? finalAnswers.needs.map((n) => needsMap[n]).join(", ")
      : "ej angivet";

    return `Du är en expert på ALLA svenska företagsstöd, bidrag och finansieringsmöjligheter. Du har djup kunskap om bidrag från ALLA dessa källor:

STATLIGA MYNDIGHETER:
- Tillväxtverket (regionalt investeringsstöd, företagsstöd, EU:s regionalfond, konsultcheckar)
- Vinnova (innovationsbidrag, förstudier, samverkansprojekt, utmaningsdriven innovation)
- Energimyndigheten (energieffektivisering, klimatpremien, biogas, fossilfritt)
- Jordbruksverket (investeringsstöd jordbruk, landsbygdsutveckling, livsmedelsförädling)
- Arbetsförmedlingen (starta eget-bidrag, nystartsjobb, lönebidrag, yrkesintroduktion)
- Länsstyrelserna (regionala företagsstöd, specifika för varje län)
- Almi (förstudiemedel, innovationslån, mikrolån, mentorskap)
- Business Sweden (exportstöd, internationaliseringscheck)
- Konstnärsnämnden / Kulturrådet (stöd för kreativa näringar)
- Saminvest (statligt riskkapital via fonder)

REGIONALA STÖD (${regionMap[finalAnswers.region] || "ej angivet"}):
- Regionens egna företagsstöd, mikrostöd och investeringsbidrag
- Lokala science parks och inkubatorer
- Kommunalt näringslivsstöd

EU-FONDER:
- Regionalfonden (ERUF) via Tillväxtverket
- Socialfonden (ESF+)
- Horizon Europe / EIC Accelerator
- Eurostars
- NOPEF (nordisk exportfinansiering)

Baserat på detta företags situation, ge en KOMPLETT lista med relevanta stöd, bidrag och finansieringsmöjligheter.

Bolagsform: ${companyTypeMap[finalAnswers.company_type] || "ej angivet"}
Antal anställda: ${employeesMap[finalAnswers.employees] || "ej angivet"}
Län: ${regionMap[finalAnswers.region] || "ej angivet"}
Behov: ${needs}
Årsomsättning: ${revenueMap[finalAnswers.revenue] || "ej angivet"}
Bransch: ${industryMap[finalAnswers.industry] || "ej angivet"}

VIKTIGT:
- Inkludera ÄVEN bidrag som inte är branschspecifika men som företaget kvalificerar för baserat på storlek, region eller behov
- Exempelvis: ett restaurangföretag KAN kvalificera för hållbarhetsbidrag från Energimyndigheten
- Inkludera regionala stöd specifika för ${regionMap[finalAnswers.region] || "deras län"}
- Om företaget planerar att starta, inkludera starta eget-stöd`;
  };

  const jsonInstructions = `Svara ENBART med giltig JSON (ingen markdown, inga backticks). Formatet ska vara:
{
  "benefits": [
    {
      "name": "Namn på bidraget/stödet",
      "agency": "Ansvarig myndighet/organisation",
      "description": "Kort beskrivning (1-2 meningar)",
      "amount": "Ungefärligt belopp eller intervall, annars 'Varierar'",
      "deadline": "Nästa deadline eller 'Löpande ansökan' om ingen fast deadline",
      "eligibility_summary": "Kort sammanfattning av vem som kan söka och huvudkraven (2-3 meningar)",
      "required_docs": "Vilka dokument/underlag som behövs för ansökan",
      "how_to_apply": "Kort instruktion för hur man ansöker",
      "url": "Officiell länk till mer info",
      "priority": "high/medium/low",
      "category": "Kategori: investering/innovation/export/hållbarhet/personal/regional/eu/starta-eget"
    }
  ],
  "summary": "En kort sammanfattning av företagets totala möjligheter (2-3 meningar)",
  "total_potential": "Ungefärlig total summa företaget potentiellt kan söka"
}

Inkludera 6-12 relevanta bidrag/stöd, sorterade efter deadline (närmast deadline först, löpande sist). Var specifik och korrekt. Inkludera regionala stöd. Blanda inte ihop lån och bidrag — märk tydligt.`;

  const callAPI = async (prompt) => {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      .map((item) => (item.type === "text" ? item.text : ""))
      .filter(Boolean)
      .join("\n");

    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  };

  const fetchResults = async (finalAnswers) => {
    setLoading(true);
    setError(null);
    setFeedback({});
    setRefineCount(0);
    transition(() => setStep(categories.length));

    const contextPrompt = buildPrompt(finalAnswers);

    try {
      const parsed = await callAPI(`${contextPrompt}\n\n${jsonInstructions}`);
      setResult(parsed);
    } catch (err) {
      console.error("Error:", err);
      setError("Något gick fel. Försök igen om en stund.");
    } finally {
      setLoading(false);
    }
  };

  const refineResults = async () => {
    // Build feedback summary from user's input
    const feedbackEntries = Object.entries(feedback);
    const notEligible = feedbackEntries
      .filter(([, fb]) => fb.eligible === "no")
      .map(([idx, fb]) => {
        const benefit = result.benefits[parseInt(idx)];
        const reason = fb.reason ? ` — Anledning: ${fb.reason}` : "";
        return `- "${benefit.name}" (ej aktuellt${reason})`;
      });

    const eligible = feedbackEntries
      .filter(([, fb]) => fb.eligible === "yes")
      .map(([idx]) => {
        const benefit = result.benefits[parseInt(idx)];
        return `- "${benefit.name}" (aktuellt, användaren vill ha mer av denna typ)`;
      });

    if (notEligible.length === 0 && eligible.length === 0) return;

    setRefining(true);
    setError(null);

    const contextPrompt = buildPrompt(answers);

    let feedbackPrompt = `${contextPrompt}

ANVÄNDARENS FEEDBACK PÅ TIDIGARE REKOMMENDATIONER:
`;
    if (notEligible.length > 0) {
      feedbackPrompt += `\nInte aktuella (ta bort dessa och liknande):\n${notEligible.join("\n")}`;
    }
    if (eligible.length > 0) {
      feedbackPrompt += `\nAktuella (hitta fler av denna typ):\n${eligible.join("\n")}`;
    }

    feedbackPrompt += `

Baserat på feedbacken, ge en UPPDATERAD och FÖRBÄTTRAD lista. Ta bort bidrag som inte passar baserat på användarens anledningar. Ersätt dem med bättre matchningar. Prioritera typer av bidrag som användaren markerat som aktuella.`;

    try {
      const parsed = await callAPI(`${feedbackPrompt}\n\n${jsonInstructions}`);
      setResult(parsed);
      setFeedback({});
      setRefineCount((c) => c + 1);
    } catch (err) {
      console.error("Refine error:", err);
      setError("Något gick fel vid förfining. Försök igen.");
    } finally {
      setRefining(false);
    }
  };

  const restart = () => {
    transition(() => {
      setStep(-1);
      setAnswers({});
      setMultiSelect([]);
      setResult(null);
      setError(null);
      setFeedback({});
      setRefineCount(0);
    });
  };

  const progress = step >= 0 ? (step / categories.length) * 100 : 0;
  const current = categories[step];

  const hasFeedback = Object.values(feedback).some((fb) => fb.eligible);
  const accentGlow = "rgba(56, 189, 248, 0.3)";

  return (
    <>
      <Head>
        <title>Bidragsguiden — Hitta bidrag och stöd för ditt företag</title>
        <meta name="description" content="AI-driven guide som hittar alla svenska bidrag, stöd och finansieringsmöjligheter för ditt företag. Alla bolagsformer. Ingen data sparas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#e2e8f0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background orbs */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{
            position: "absolute", top: "-20%", right: "-10%", width: "600px", height: "600px",
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)",
            borderRadius: "50%",
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", left: "-5%", width: "500px", height: "500px",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)",
            borderRadius: "50%",
          }} />
        </div>

        <div style={{
          position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto",
          padding: "40px 16px", minHeight: "100vh",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #38bdf8, #10b981)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#0a1628",
                fontFamily: "'Space Mono', monospace",
                boxShadow: `0 0 20px ${accentGlow}`,
              }}>B</div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, margin: 0,
                background: "linear-gradient(90deg, #38bdf8, #10b981)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                fontFamily: "'Space Mono', monospace", letterSpacing: "-0.5px",
              }}>Bidragsguiden</h1>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, letterSpacing: "0.5px" }}>
              Hitta alla bidrag och stöd för ditt företag
            </p>
          </div>

          {/* Progress bar */}
          {step >= 0 && step < categories.length && (
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", marginBottom: 6,
                fontSize: 11, color: "#64748b", fontFamily: "'Space Mono', monospace",
              }}>
                <span>Fråga {step + 1} av {categories.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`,
                  background: "linear-gradient(90deg, #38bdf8, #10b981)",
                  borderRadius: 2, transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          )}

          {/* Content area */}
          <div style={{
            flex: 1, opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}>
            {/* Welcome screen */}
            {step === -1 && (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <div style={{
                  width: 80, height: 80, margin: "0 auto 24px",
                  borderRadius: 20, background: "linear-gradient(135deg, #38bdf8, #10b981)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36, boxShadow: "0 0 40px rgba(56, 189, 248, 0.25)",
                }}>
                  <span role="img" aria-label="Swedish flag">🇸🇪</span>
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.2 }}>
                  Vilka bidrag kan<br />ditt företag få?
                </h2>
                <p style={{
                  fontSize: 15, color: "#94a3b8", lineHeight: 1.6,
                  maxWidth: 440, margin: "0 auto 12px",
                }}>
                  Svara på 6 snabba frågor så söker vår AI igenom hundratals
                  bidrag från Tillväxtverket, Vinnova, Almi, Energimyndigheten,
                  EU-fonder och fler.
                </p>
                <p style={{
                  fontSize: 13, color: "#64748b", lineHeight: 1.5,
                  maxWidth: 400, margin: "0 auto 36px",
                }}>
                  Alla bolagsformer. Alla branscher. Alla regioner.
                </p>

                <button
                  onClick={() => transition(() => setStep(0))}
                  style={{
                    background: "linear-gradient(135deg, #38bdf8, #10b981)",
                    color: "#0a1628", border: "none", borderRadius: 14,
                    padding: "16px 48px", fontSize: 16, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s", boxShadow: "0 0 30px rgba(56, 189, 248, 0.2)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(56, 189, 248, 0.35)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(56, 189, 248, 0.2)";
                  }}
                >Hitta bidrag →</button>

                <div style={{
                  marginTop: 32, display: "flex", justifyContent: "center", gap: 20,
                  fontSize: 12, color: "#475569", flexWrap: "wrap",
                }}>
                  <span>🔒 Ingen data sparas</span>
                  <span>⚡ Tar 1 minut</span>
                  <span>🤖 AI-driven</span>
                </div>
              </div>
            )}

            {/* Questions */}
            {step >= 0 && step < categories.length && current && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>
                  {current.question}
                </h2>
                {current.description && (
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.4 }}>
                    {current.description}
                  </p>
                )}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: current.options.length <= 6 ? "1fr" : "1fr 1fr",
                  gap: 10,
                  maxHeight: current.options.length > 10 ? 420 : "none",
                  overflowY: current.options.length > 10 ? "auto" : "visible",
                  paddingRight: current.options.length > 10 ? 4 : 0,
                }}>
                  {current.options.map((opt) => {
                    const isSelected = current.multi
                      ? multiSelect.includes(opt.value)
                      : answers[current.id] === opt.value;

                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          current.multi ? toggleMulti(opt.value) : handleSingleSelect(current.id, opt.value)
                        }
                        style={{
                          background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSelected ? "rgba(56, 189, 248, 0.5)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 12, padding: "14px 16px",
                          color: isSelected ? "#38bdf8" : "#cbd5e1",
                          fontSize: 14, fontWeight: 500, cursor: "pointer",
                          textAlign: "left", fontFamily: "'DM Sans', sans-serif",
                          transition: "all 0.2s ease",
                          display: "flex", alignItems: "center", gap: 10,
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                          }
                        }}
                      >
                        {opt.icon && <span style={{ fontSize: 18 }}>{opt.icon}</span>}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {current.multi && (
                  <button
                    onClick={() => handleMultiConfirm(current.id)}
                    disabled={multiSelect.length === 0}
                    style={{
                      marginTop: 20, width: "100%",
                      background: multiSelect.length > 0
                        ? "linear-gradient(135deg, #38bdf8, #10b981)"
                        : "rgba(255,255,255,0.05)",
                      color: multiSelect.length > 0 ? "#0a1628" : "#475569",
                      border: "none", borderRadius: 12,
                      padding: "14px", fontSize: 15, fontWeight: 600,
                      cursor: multiSelect.length > 0 ? "pointer" : "default",
                      fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                    }}
                  >Fortsätt →</button>
                )}
                {step > 0 && (
                  <button
                    onClick={() => transition(() => setStep(step - 1))}
                    style={{
                      marginTop: 12, background: "none", border: "none",
                      color: "#64748b", fontSize: 13, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", padding: "8px 0",
                    }}
                  >← Tillbaka</button>
                )}
              </div>
            )}

            {/* Loading */}
            {step >= categories.length && (loading || refining) && (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{
                  width: 60, height: 60, margin: "0 auto 24px",
                  borderRadius: 15,
                  background: "rgba(56, 189, 248, 0.1)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "pulse 2s infinite",
                }}>
                  <span style={{ fontSize: 28 }}>{refining ? "🔄" : "📊"}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  {refining ? "Förfinar dina rekommendationer" : "Söker igenom alla bidragskällor"}<LoadingDots />
                </h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
                  {refining
                    ? "Anpassar resultaten baserat på din feedback"
                    : "Tillväxtverket, Vinnova, Almi, Energimyndigheten, regionala stöd, EU-fonder och fler"}
                </p>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
              </div>
            )}

            {/* Error */}
            {error && !loading && !refining && (
              <div style={{ textAlign: "center", paddingTop: 20, marginBottom: 20 }}>
                <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
                <button onClick={restart} style={{
                  background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 10,
                  padding: "12px 24px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>Börja om</button>
              </div>
            )}

            {/* Results */}
            {result && !loading && !refining && (
              <div ref={resultRef}>
                {/* Refine count badge */}
                {refineCount > 0 && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 20, marginBottom: 16,
                    fontSize: 11, fontWeight: 600,
                    background: "rgba(167, 139, 250, 0.1)",
                    color: "#a78bfa",
                    border: "1px solid rgba(167, 139, 250, 0.25)",
                  }}>
                    🎯 Förfinad {refineCount} {refineCount === 1 ? "gång" : "gånger"}
                  </div>
                )}

                {/* Summary */}
                <div style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: 14, padding: "20px", marginBottom: 24,
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: "#10b981" }}>
                    Din sammanfattning
                  </h3>
                  <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{result.summary}</p>
                  {result.total_potential && (
                    <div style={{
                      marginTop: 12, padding: "10px 14px", borderRadius: 8,
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.15)",
                      fontSize: 14, fontWeight: 600, color: "#10b981",
                      fontFamily: "'Space Mono', monospace",
                    }}>
                      Potentiellt sökbart: {result.total_potential}
                    </div>
                  )}
                </div>

                {/* Instruction */}
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 20,
                  background: "rgba(56, 189, 248, 0.04)",
                  border: "1px solid rgba(56, 189, 248, 0.1)",
                  fontSize: 13, color: "#64748b", lineHeight: 1.5,
                }}>
                  💡 Markera vilka bidrag som passar och vilka som inte gör det.
                  Klicka sedan <strong style={{ color: "#a78bfa" }}>Förfina</strong> för bättre rekommendationer.
                </div>

                <h3 style={{
                  fontSize: 14, fontWeight: 600, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: "1px",
                  marginBottom: 16, fontFamily: "'Space Mono', monospace",
                }}>
                  {result.benefits?.length || 0} bidrag och stöd hittade
                </h3>

                {/* Grant cards */}
                {result.benefits?.map((benefit, i) => (
                  <GrantCard
                    key={`${refineCount}-${i}`}
                    benefit={benefit}
                    index={i}
                    feedback={feedback[i]}
                    onFeedbackChange={handleFeedbackChange}
                  />
                ))}

                {/* Refine button */}
                {hasFeedback && (
                  <button
                    onClick={refineResults}
                    style={{
                      marginTop: 8, width: "100%",
                      background: "linear-gradient(135deg, #a78bfa, #38bdf8)",
                      color: "#0a1628", border: "none", borderRadius: 12,
                      padding: "16px", fontSize: 15, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.2s",
                      boxShadow: "0 0 20px rgba(167, 139, 250, 0.2)",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 0 30px rgba(167, 139, 250, 0.3)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(167, 139, 250, 0.2)";
                    }}
                  >
                    🎯 Förfina rekommendationer baserat på din feedback
                  </button>
                )}

                <div style={{
                  marginTop: 24, padding: "16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 12, color: "#475569", lineHeight: 1.5, textAlign: "center",
                }}>
                  ⚠️ Informationen är vägledande och baseras på AI-analys.
                  Kontakta respektive myndighet för exakta villkor och aktuella belopp.
                  Bidragslandskapet förändras — kontrollera alltid att utlysningen är öppen.
                </div>

                <button
                  onClick={restart}
                  style={{
                    marginTop: 16, width: "100%",
                    background: "rgba(56, 189, 248, 0.1)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: 12, padding: "14px", fontSize: 15,
                    fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "rgba(56, 189, 248, 0.18)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)"; }}
                >🔄 Börja om från början</button>
              </div>
            )}
          </div>

          {/* Info panels */}
          <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: infoPanel ? 16 : 0 }}>
              <button
                onClick={() => setInfoPanel(infoPanel === "gdpr" ? null : "gdpr")}
                style={{
                  background: infoPanel === "gdpr" ? "rgba(56, 189, 248, 0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${infoPanel === "gdpr" ? "rgba(56, 189, 248, 0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8, padding: "8px 16px",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  color: infoPanel === "gdpr" ? "#38bdf8" : "#64748b",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}
              >🔒 Integritet</button>
              <button
                onClick={() => setInfoPanel(infoPanel === "how" ? null : "how")}
                style={{
                  background: infoPanel === "how" ? "rgba(56, 189, 248, 0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${infoPanel === "how" ? "rgba(56, 189, 248, 0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8, padding: "8px 16px",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  color: infoPanel === "how" ? "#38bdf8" : "#64748b",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}
              >⚙️ Hur fungerar det?</button>
            </div>

            {infoPanel === "gdpr" && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "24px",
                animation: "fadeSlide 0.3s ease",
              }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#38bdf8" }}>
                  🔒 Integritet & GDPR
                </h4>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>Ingen data sparas.</span>{" "}
                    Dina svar lagras inte i någon databas. All information försvinner när du stänger sidan.
                  </p>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>Ingen spårning.</span>{" "}
                    Inga cookies, inga analytics, inget spårningsskript. Helt anonymt.
                  </p>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>AI-behandling.</span>{" "}
                    Anonyma svar skickas till Claude (Anthropic) för analys. Anthropic lagrar inte API-konversationer
                    och använder inte din data för att träna modeller.
                  </p>
                  <p style={{
                    margin: 0, padding: "12px 16px",
                    background: "rgba(56, 189, 248, 0.06)", borderRadius: 8,
                    border: "1px solid rgba(56, 189, 248, 0.1)",
                  }}>
                    <span style={{ fontWeight: 600, color: "#cbd5e1" }}>Kort sagt:</span>{" "}
                    Vi samlar inte in, lagrar inte och delar inte dina uppgifter.
                  </p>
                </div>
              </div>
            )}

            {infoPanel === "how" && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "24px",
                animation: "fadeSlide 0.3s ease",
              }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#38bdf8" }}>
                  ⚙️ Hur fungerar Bidragsguiden?
                </h4>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: 8,
                      background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#38bdf8",
                      fontFamily: "'Space Mono', monospace",
                    }}>1</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>Du svarar på 6 frågor</div>
                      Bolagsform, storlek, region, behov, omsättning och bransch.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: 8,
                      background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#38bdf8",
                      fontFamily: "'Space Mono', monospace",
                    }}>2</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>AI söker igenom hundratals bidrag</div>
                      Alla myndigheter, regionala stöd och EU-fonder matchas mot din profil.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: 8,
                      background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#10b981",
                      fontFamily: "'Space Mono', monospace",
                    }}>3</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>Du ger feedback, AI lär sig</div>
                      Markera vad som passar och vad som inte gör det. AI:n förfinar resultaten baserat på din input.
                    </div>
                  </div>
                  <div style={{
                    padding: "14px 16px", background: "rgba(251, 191, 36, 0.06)",
                    borderRadius: 8, border: "1px solid rgba(251, 191, 36, 0.15)",
                  }}>
                    <div style={{ fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}>⚠️ Viktigt</div>
                    Bidragsguiden ger vägledning baserad på AI och ersätter inte professionell rådgivning.
                    Kontrollera alltid villkor direkt hos respektive myndighet.
                  </div>
                </div>
              </div>
            )}
            <style>{`@keyframes fadeSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          </div>

          <div style={{
            textAlign: "center", paddingTop: 16, paddingBottom: 16,
            fontSize: 11, color: "#334155", fontFamily: "'Space Mono', monospace",
          }}>
            Bidragsguiden &copy; 2026
          </div>
        </div>
      </div>
    </>
  );
}
