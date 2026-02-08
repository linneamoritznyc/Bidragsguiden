import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { QUIZ_CATEGORIES } from "../components/questions";
import { KOMMUNER_BY_LAN } from "../components/kommuner";
import { useAuth } from "../lib/auth";
import { saveGrant, saveQuizAnswers, getQuizAnswers, saveUserSearch } from "../lib/dashboard";
import {
  getSession,
  saveSearch,
  updateSearch,
  saveFeedback,
  deleteFeedback,
  getSearchHistory,
  deleteSearch,
  clearAllSearches,
} from "../lib/supabase";
import { resultToText, copyToClipboard, downloadAsFile, downloadAsPDF } from "../lib/export";

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
function GrantCard({ benefit, index, feedback, onFeedbackChange, saved, onSaveToDashboard, dashboardSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [reasonInput, setReasonInput] = useState(feedback?.reason || "");

  const priorityColors = {
    high: { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)", text: "#10b981", label: "Hög relevans" },
    medium: { bg: "rgba(96, 165, 250, 0.15)", border: "rgba(96, 165, 250, 0.4)", text: "#60a5fa", label: "Medel relevans" },
    low: { bg: "rgba(148, 163, 184, 0.1)", border: "rgba(148, 163, 184, 0.3)", text: "#94a3b8", label: "Låg relevans" },
  };
  const p = priorityColors[benefit.priority] || priorityColors.medium;

  const eligibility = feedback?.eligible; // "yes", "no", "unsure", or undefined

  const cardBorder = eligibility === "no"
    ? "rgba(239, 68, 68, 0.3)"
    : eligibility === "yes"
      ? "rgba(16, 185, 129, 0.4)"
      : eligibility === "unsure"
        ? "rgba(251, 191, 36, 0.4)"
        : p.border;

  const cardOpacity = eligibility === "no" ? 0.6 : 1;

  return (
    <div style={{
      background: saved ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${saved ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14, padding: "20px",
      marginBottom: 12, borderLeft: `3px solid ${saved ? "rgba(16, 185, 129, 0.4)" : cardBorder}`,
      opacity: saved ? 0.75 : cardOpacity,
      transition: "all 0.3s ease",
    }}>
      {/* Saved label */}
      {saved && (
        <div style={{
          display: "inline-block", marginBottom: 10,
          padding: "3px 10px", borderRadius: 8,
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          fontSize: 10, fontWeight: 600, color: "#10b981",
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          Sparad från förra sökningen
        </div>
      )}
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
        {benefit.how_to_apply}
      </p>

      {/* Link */}
      {benefit.url && (
        <a href={benefit.url} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", fontSize: 13, color: "#38bdf8",
          textDecoration: "none", fontWeight: 500, marginBottom: 16,
        }}>Läs mer på {benefit.agency} →</a>
      )}

      {/* AI answer to user's question */}
      {benefit.user_answer && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 12,
          background: "rgba(167, 139, 250, 0.06)",
          border: "1px solid rgba(167, 139, 250, 0.2)",
        }}>
          <div style={{
            fontSize: 10, color: "#a78bfa", textTransform: "uppercase",
            letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600,
          }}>
            Svar på din fråga
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
            {benefit.user_answer}
          </div>
        </div>
      )}

      {/* Save to dashboard button */}
      {onSaveToDashboard && !saved && (
        <div style={{ marginBottom: 12 }}>
          {dashboardSaved ? (
            <div style={{
              padding: "8px 14px", borderRadius: 8,
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              fontSize: 12, color: "#10b981", fontWeight: 500,
              textAlign: "center",
            }}>Sparad i din dashboard</div>
          ) : (
            <button
              onClick={() => onSaveToDashboard(benefit)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                color: "#10b981", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)"; }}
            >Spara till min dashboard</button>
          )}
        </div>
      )}

      {/* Eligible / Not Eligible buttons */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: 12, marginTop: 4,
      }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Stämmer detta för dig?</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              if (eligibility === "yes") {
                onFeedbackChange(index, { eligible: undefined, reason: "" });
                setReasonInput("");
                setExpanded(false);
              } else {
                onFeedbackChange(index, { eligible: "yes", reason: reasonInput });
                setExpanded(true);
              }
            }}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              background: eligibility === "yes" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.04)",
              color: eligibility === "yes" ? "#10b981" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            Kan vara aktuellt
          </button>
          <button
            onClick={() => {
              if (eligibility === "unsure") {
                onFeedbackChange(index, { eligible: undefined, reason: "" });
                setReasonInput("");
                setExpanded(false);
              } else {
                onFeedbackChange(index, { eligible: "unsure", reason: reasonInput });
                setExpanded(true);
              }
            }}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              background: eligibility === "unsure" ? "rgba(251, 191, 36, 0.2)" : "rgba(255,255,255,0.04)",
              color: eligibility === "unsure" ? "#fbbf24" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            Vet ej
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
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              background: eligibility === "no" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.04)",
              color: eligibility === "no" ? "#ef4444" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            Inte aktuellt
          </button>
        </div>

        {/* Comment input - shown when any feedback button is active */}
        {eligibility && expanded && (
          <div style={{ marginTop: 10, animation: "fadeSlide 0.3s ease" }}>
            <textarea
              value={reasonInput}
              onChange={(e) => {
                setReasonInput(e.target.value);
                onFeedbackChange(index, { eligible, reason: e.target.value });
              }}
              placeholder={
                eligibility === "yes"
                  ? "Valfritt: Ställ en fråga, t.ex. 'Gäller detta enskild firma?' eller 'Vilka dokument behövs egentligen?'"
                  : eligibility === "unsure"
                    ? "Valfritt: Vad undrar du? T.ex. 'Vet inte om vi uppfyller storlekskravet' eller 'Gäller det min bransch?'"
                    : "Valfritt: Varför passar det inte? T.ex. 'Vi har för få anställda' eller 'Vi är inte i rätt län'"
              }
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
  const { user } = useAuth();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [multiSelect, setMultiSelect] = useState([]);
  const [result, setResult] = useState(null);
  const [dashboardSaved, setDashboardSaved] = useState({}); // { grantName: true }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [infoPanel, setInfoPanel] = useState(null);
  const [feedback, setFeedback] = useState({}); // { index: { eligible: "yes"/"no"/"unsure", reason: "..." } }
  const [refineCount, setRefineCount] = useState(0);
  const [refining, setRefining] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [searchId, setSearchId] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refineComment, setRefineComment] = useState("");
  const [savedGrants, setSavedGrants] = useState([]); // grants user marked "yes" across refines
  const [usageInfo, setUsageInfo] = useState(null); // { used, limit }
  const [dailyLimitHit, setDailyLimitHit] = useState(null); // limit error message
  const [kommun, setKommun] = useState(null); // follow-up: which municipality
  const [showKommunPrompt, setShowKommunPrompt] = useState(true); // show the kommun question
  const [savedProfile, setSavedProfile] = useState(null); // saved quiz answers from profile
  const [showPrefillBanner, setShowPrefillBanner] = useState(false);
  const resultRef = useRef(null);

  const categories = QUIZ_CATEGORIES;

  // Initialize Supabase session and load history
  useEffect(() => {
    async function init() {
      const sid = await getSession();
      if (sid) {
        setSessionId(sid);
        const hist = await getSearchHistory(sid);
        setHistory(hist);
      }
    }
    init();
  }, []);

  // Load saved quiz answers for logged-in users
  useEffect(() => {
    async function loadSavedProfile() {
      if (!user) return;
      const data = await getQuizAnswers(user.id);
      if (data?.quiz_answers && Object.keys(data.quiz_answers).length > 0) {
        setSavedProfile(data.quiz_answers);
        // Show prefill banner only on landing (step === -1)
        if (step === -1) {
          setShowPrefillBanner(true);
        }
      }
    }
    loadSavedProfile();
  }, [user]);

  const refreshHistory = useCallback(async () => {
    if (sessionId) {
      const hist = await getSearchHistory(sessionId);
      setHistory(hist);
    }
  }, [sessionId]);

  // Restore multiSelect when navigating back to a multi-select question
  useEffect(() => {
    const current = categories[step];
    if (current?.multi && answers[current.id]) {
      setMultiSelect(Array.isArray(answers[current.id]) ? answers[current.id] : []);
    } else if (current?.multi) {
      setMultiSelect([]);
    }
  }, [step]);

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

    // Persist to Supabase
    if (searchId && result?.benefits?.[index]) {
      if (value.eligible) {
        saveFeedback({
          searchId,
          benefitIndex: index,
          benefitName: result.benefits[index].name,
          eligible: value.eligible,
          reason: value.reason,
        });
      } else {
        deleteFeedback({ searchId, benefitIndex: index });
      }
    }
  };

  const buildPrompt = (finalAnswers, extraKommun) => {
    const companyTypeMap = {
      enskild_firma: "enskild firma",
      handelsbolag: "handelsbolag (HB)",
      kommanditbolag: "kommanditbolag (KB)",
      aktiebolag: "aktiebolag (AB)",
      ekonomisk_forening: "ekonomisk förening",
      ideell_forening: "ideell förening",
      planning: "planerar att starta företag",
    };
    const companyAgeMap = {
      not_started: "har inte startat än (planerar att starta)",
      less_1y: "mindre än 1 år sedan",
      "1_3y": "1-3 år sedan",
      "3_5y": "3-5 år sedan",
      over_5y: "mer än 5 år sedan",
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
      marketing_sales: "marknadsföring/försäljning",
      startup_support: "starta eget-stöd",
      rnd: "forskning & innovation",
      premises: "lokaler/expansion/flytt",
      ip_patents: "patent/immaterialrätt",
      finance_liquidity: "ekonomi/likviditet",
      pivot: "omställning/ny inriktning",
      unsure: "osäker på vad de behöver",
    };
    const revenueMap = {
      zero: "ingen omsättning ännu",
      under_300k: "under 300 000 kr (litet/hobby-företag)",
      "300k_600k": "300 000 - 600 000 kr (etablerat småföretag)",
      "600k_3m": "600 000 - 3 mkr",
      "3m_10m": "3-10 mkr",
      "10m_50m": "10-50 mkr",
      over_50m: "över 50 mkr",
      prefer_not_to_say: "vill inte ange omsättning",
    };
    const industryMap = {
      tech: "Tech/IT/SaaS", ecommerce: "Handel/E-commerce",
      manufacturing: "Tillverkning/Industri", construction: "Bygg/Fastighet",
      cleaning_facility: "Städ/Fastighetsservice", hospitality: "Restaurang/Besöksnäring",
      health: "Hälsa/Vård/Life Science", beauty_personal: "Skönhet/Frisör/Personlig vård",
      transport: "Transport/Logistik", automotive: "Fordon/Verkstad",
      consulting: "Konsult/Tjänsteföretag", creative: "Kreativa branschen/Kultur",
      agriculture: "Jordbruk/Livsmedel", energy: "Energi/Cleantech",
      education: "Utbildning", other: "Annan/blandad bransch",
    };
    const offeringMap = {
      physical_products: "fysiska produkter/varor",
      services: "tjänster",
      both: "både varor och tjänster",
      unsure: "osäker",
    };

    const needs = Array.isArray(finalAnswers.needs)
      ? finalAnswers.needs.map((n) => needsMap[n]).join(", ")
      : "ej angivet";
    const industries = Array.isArray(finalAnswers.industry)
      ? finalAnswers.industry.map((i) => industryMap[i]).join(", ")
      : industryMap[finalAnswers.industry] || "ej angivet";

    return `Du är en expert på ALLA svenska företagsstöd, bidrag och finansieringsmöjligheter. Du har djup kunskap om bidrag från ALLA dessa källor:

STATLIGA MYNDIGHETER:
- Tillväxtverket (regionalt investeringsstöd, företagsstöd, EU:s regionalfond, konsultcheckar)
- Vinnova (innovationsbidrag, förstudier, samverkansprojekt, utmaningsdriven innovation)
- Energimyndigheten (energieffektivisering, klimatpremien, biogas, fossilfritt)
- Jordbruksverket (investeringsstöd jordbruk, landsbygdsutveckling, livsmedelsförädling)
- Arbetsförmedlingen (starta eget-bidrag, nystartsjobb, lönebidrag, yrkesintroduktion)
- Försäkringskassan (aktivitetsstöd och starta eget-bidrag för den som uppfyller särskilda villkor — upp till 12 månader)
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

SKATTELÄTTNADER OCH AVDRAG:
- RUT-avdrag (för kunder som köper hushållsnära tjänster — relevant om företaget verkar inom städ, trädgård, barnpassning etc.)
- ROT-avdrag (för kunder som köper byggtjänster — relevant om företaget är inom bygg/renovering)
- Skattereduktioner för grön teknik

Baserat på detta företags situation, ge en KOMPLETT lista med relevanta stöd, bidrag och finansieringsmöjligheter.

Bolagsform: ${companyTypeMap[finalAnswers.company_type] || "ej angivet"}
Företaget startades: ${companyAgeMap[finalAnswers.company_age] || "ej angivet"}
Antal anställda: ${employeesMap[finalAnswers.employees] || "ej angivet"}
Län: ${regionMap[finalAnswers.region] || "ej angivet"}${extraKommun && extraKommun !== "prefer_not_to_say" ? `\nKommun: ${extraKommun}` : ""}
Behov: ${needs}
Årsomsättning: ${revenueMap[finalAnswers.revenue] || "ej angivet"}
Bransch: ${industries}
Erbjudande: ${offeringMap[finalAnswers.offering_type] || "ej angivet"}

VIKTIGT:
- Inkludera ÄVEN bidrag som inte är branschspecifika men som företaget kvalificerar för baserat på storlek, region eller behov
- Exempelvis: ett restaurangföretag KAN kvalificera för hållbarhetsbidrag från Energimyndigheten
- Inkludera regionala stöd specifika för ${regionMap[finalAnswers.region] || "deras län"}
- Om företaget planerar att starta, inkludera starta eget-stöd
- Om företaget är inom en RUT/ROT-bransch (städ, bygg, trädgård etc), nämn hur RUT/ROT-avdraget gynnar deras kunder och affärsmodell
- Tänk även på Försäkringskassans starta-eget-bidrag om personen planerar att starta (kan vara aktuellt för den som uppfyller Försäkringskassans villkor)
- VIKTIGT om företagets ålder: Starta-eget-bidrag (t.ex. från Arbetsförmedlingen) kan BARA sökas INNAN man registrerar företaget. Om företaget redan är startat, rekommendera INTE starta-eget-bidrag — nämn istället att det tyvärr inte längre är aktuellt.
- Om företaget startades för mer än 3 år sedan, fokusera på tillväxt- och utvecklingsbidrag istället för nystartsstöd.
- Om en kommun anges: Arbetsförmedlingens lönestöd och kompetensförsörjningsstöd kan variera beroende på kommun — ta hänsyn till detta. Kommunens eget näringslivsstöd och lokala utvecklingsprogram kan också vara relevanta.
- Om omsättning anges som "under 300 000 kr" — detta kan vara ett hobbyföretag eller nystartat. Fokusera på nystartsstöd, mikrobidrag och grundläggande rådgivning.
- Om omsättning är "300 000 - 600 000 kr" — detta är ett litet men etablerat företag. Inkludera stöd för tillväxt och expansion.

KRITISKT — ALDRIG lämna användaren utan hopp:
- Om få bidrag matchar exakt, inkludera ÄNDÅ närliggande stöd som kan bli aktuella med mindre justeringar
- Ge alltid konkreta rekommendationer: "Om du gör X kan du kvalificera för Y"
- Nämn om bidragslandskapet brukar ändras och att det kan vara värt att kolla igen om 6 månader
- Föreslå konkreta steg: registrera företag hos Almi för rådgivning, kontakta regionens näringslivsenhet, etc.`;
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
      "priority": "high/medium/low (baserat på hur relevant bidraget är för DETTA specifika företag — high = troligt att de kvalificerar, medium = möjligt men osäkert, low = kan vara relevant men matchar inte alla kriterier)",
      "category": "Kategori: investering/innovation/export/hållbarhet/personal/regional/eu/starta-eget",
      "user_answer": "Om användaren ställt en fråga eller skrivit en kommentar om just detta bidrag, BESVARA frågan här direkt och tydligt (2-4 meningar). Om ingen fråga ställts, sätt till null."
    }
  ],
  "recommendations": [
    "Konkret rekommendation 1 — t.ex. 'Kontakta Almis regionala kontor i X län för gratis rådgivning'",
    "Konkret rekommendation 2 — t.ex. 'Om ni börjar exportera kan ni söka internationaliseringscheckar från Business Sweden'",
    "Konkret rekommendation 3 — t.ex. 'Bidragslandskapet ändras löpande — det kan vara värt att söka igen om 6 månader'"
  ],
  "summary": "En kort sammanfattning av företagets totala möjligheter (2-3 meningar). Om få bidrag matchar, var uppmuntrande och förklara vilka möjligheter som kan öppna sig.",
  "total_potential": "Ungefärlig total summa företaget potentiellt kan söka",
  "follow_up_questions": [
    "Relevant uppföljningsfråga 1 baserat på företagets situation",
    "Relevant uppföljningsfråga 2 som kan leda till fler bidrag",
    "Relevant uppföljningsfråga 3 om specifika möjligheter"
  ]
}

Inkludera 6-12 relevanta bidrag/stöd, sorterade efter deadline (närmast deadline först, löpande sist). Var specifik och korrekt. Inkludera regionala stöd. Blanda inte ihop lån och bidrag — märk tydligt.

VIKTIGT: Använd INGA emojis i texten. Inga symboler som 🎯 💡 📝 ✓ ✗ etc. Ren text utan emojis.

VIKTIGT om recommendations-fältet:
- Ge ALLTID minst 3 konkreta rekommendationer
- Inkludera praktiska nästa steg (kontakta Almi, ring regionens näringslivsenhet, etc.)
- Om få bidrag hittades, ge tips om vad företaget kan göra för att kvalificera sig i framtiden
- Nämn att bidragslandskapet ändras och att det kan vara värt att kolla igen
- Om relevant, nämn skattelättnader som RUT/ROT som inte är bidrag men gynnar företaget

VIKTIGT om follow_up_questions:
- Ge ALLTID exakt 3 smarta uppföljningsfrågor som AI:n ställer TILL användaren
- Frågorna ska vara relevanta baserat på företagets svar och de bidrag som hittades
- Syftet är att användaren kan klicka på en fråga för att förfina resultaten
- Formulera frågorna som JA/NEJ eller korta svar, t.ex.:
  "Planerar ni att anställa personal de närmaste 12 månaderna?"
  "Har ni verksamhet inom miljö- eller klimatområdet?"
  "Exporterar ni eller planerar ni att börja exportera?"
  "Har grundaren relevant högskoleutbildning?"
- Anpassa frågorna efter vad som INTE redan besvarats i quizet
- Välj frågor som faktiskt kan öppna upp nya bidragsmöjligheter`;

  const callAPI = async (prompt) => {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        sessionId: sessionId || undefined,
        userId: user?.id || undefined,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.error === "daily_limit") {
        setDailyLimitHit(errData);
        throw new Error("daily_limit");
      }
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Track usage info from response
    if (data._usage) {
      setUsageInfo(data._usage);
    }

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
    setDailyLimitHit(null);
    setFeedback({});
    setRefineCount(0);
    transition(() => setStep(categories.length));

    const contextPrompt = buildPrompt(finalAnswers, kommun);

    try {
      const parsed = await callAPI(`${contextPrompt}\n\n${jsonInstructions}`);
      setResult(parsed);

      // Save to Supabase (anonymous session)
      if (sessionId) {
        const sid = await saveSearch({
          sessionId,
          answers: finalAnswers,
          result: parsed,
          refineCount: 0,
        });
        setSearchId(sid);
        refreshHistory();
      }

      // Save to user profile (logged-in users)
      if (user?.id) {
        saveQuizAnswers({ userId: user.id, answers: finalAnswers, kommun });
        saveUserSearch({
          userId: user.id,
          answers: finalAnswers,
          result: parsed,
          kommun,
          refineCount: 0,
        });
      }
    } catch (err) {
      if (err.message !== "daily_limit") {
        console.error("Error:", err);
        setError("Något gick fel. Försök igen om en stund.");
      }
    } finally {
      setLoading(false);
    }
  };

  const refineResults = async (extraComment) => {
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
      .map(([idx, fb]) => {
        const benefit = result.benefits[parseInt(idx)];
        const comment = fb.reason ? ` — Kommentar: ${fb.reason}` : "";
        return `- "${benefit.name}" (aktuellt, användaren vill ha mer av denna typ${comment})`;
      });

    const unsure = feedbackEntries
      .filter(([, fb]) => fb.eligible === "unsure")
      .map(([idx, fb]) => {
        const benefit = result.benefits[parseInt(idx)];
        const comment = fb.reason ? ` — Fråga: ${fb.reason}` : "";
        return `- "${benefit.name}" (användaren vet inte om de kvalificerar${comment})`;
      });

    setRefining(true);
    setShowRefineDialog(false);
    setError(null);

    const contextPrompt = buildPrompt(answers, kommun);

    let feedbackPrompt = `${contextPrompt}

ANVÄNDARENS FEEDBACK PÅ TIDIGARE REKOMMENDATIONER:
`;
    if (notEligible.length > 0) {
      feedbackPrompt += `\nInte aktuella (ta bort dessa och liknande):\n${notEligible.join("\n")}`;
    }
    if (eligible.length > 0) {
      feedbackPrompt += `\nAktuella (hitta fler av denna typ):\n${eligible.join("\n")}`;
    }
    if (unsure.length > 0) {
      feedbackPrompt += `\nOsäkra (ge mer detalj och förtydliga kraven så användaren kan avgöra):\n${unsure.join("\n")}`;
    }
    if (extraComment && extraComment.trim()) {
      feedbackPrompt += `\n\nANVÄNDARENS EGNA KOMMENTAR/FRÅGA:\n${extraComment.trim()}`;
    }

    // Compute grants to save before building the prompt
    const newSaved = Object.entries(feedback)
      .filter(([, fb]) => fb.eligible === "yes")
      .map(([idx]) => result.benefits[parseInt(idx)])
      .filter(Boolean);

    // Tell AI which grants are already saved so it doesn't repeat them
    const allSavedNames = [
      ...savedGrants.map((g) => g.name),
      ...newSaved.map((g) => g.name),
    ];

    feedbackPrompt += `

Baserat på feedbacken, ge en UPPDATERAD och FÖRBÄTTRAD lista. Ta bort bidrag som inte passar baserat på användarens anledningar. Ersätt dem med bättre matchningar. Prioritera typer av bidrag som användaren markerat som aktuella. För bidrag markerade som "osäkra" — behåll dem men ge MYCKET mer detalj om exakta krav och villkor så användaren kan avgöra om de kvalificerar.

VIKTIGT — UNDVIK DUBBLETTER:
Användaren har redan sparat dessa bidrag: ${allSavedNames.length > 0 ? allSavedNames.map((n) => `"${n}"`).join(", ") : "inga"}.
Inkludera INTE dessa igen i din lista — ge istället NYA bidrag och stöd som inte redan finns i listan.

KRITISKT — BESVARA ANVÄNDARENS FRÅGOR:
- Om användaren har skrivit en kommentar eller fråga om ett specifikt bidrag (t.ex. "gäller detta enskild firma?"), MÅSTE du besvara den frågan i "user_answer"-fältet för just det bidraget.
- Svara direkt, tydligt och konkret. Användaren vill INTE behöva klicka på en länk och leta själv.
- Om användaren ställt en allmän fråga i sin kommentar, besvara den också i "summary"-fältet.
- Varje bidrag som hade en fråga/kommentar från användaren MÅSTE ha ett user_answer med svar.`;

    try {
      // Save grants the user marked as "yes"
      if (newSaved.length > 0) {
        setSavedGrants((prev) => {
          const existingNames = new Set(prev.map((g) => g.name));
          const unique = newSaved.filter((g) => !existingNames.has(g.name));
          return [...prev, ...unique];
        });
      }

      const parsed = await callAPI(`${feedbackPrompt}\n\n${jsonInstructions}`);
      setResult(parsed);
      setFeedback({});
      const newRefineCount = refineCount + 1;
      setRefineCount(newRefineCount);

      // Update in Supabase
      if (searchId) {
        updateSearch({ searchId, result: parsed, refineCount: newRefineCount });
      }
    } catch (err) {
      if (err.message !== "daily_limit") {
        console.error("Refine error:", err);
        setError("Något gick fel vid förfining. Försök igen.");
      }
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
      setDailyLimitHit(null);
      setFeedback({});
      setRefineCount(0);
      setSearchId(null);
      setShowHistory(false);
      setSavedGrants([]);
      setKommun(null);
      setShowKommunPrompt(true);
    });
  };

  const loadFromHistory = (entry) => {
    transition(() => {
      setAnswers(entry.answers || {});
      setResult(entry.result);
      setFeedback({});
      setRefineCount(entry.refine_count || 0);
      setSearchId(entry.id);
      setStep(categories.length);
      setShowHistory(false);
    });
  };

  const handleDeleteHistory = async (id) => {
    await deleteSearch(id);
    refreshHistory();
  };

  const handleClearAllHistory = async () => {
    if (sessionId) {
      await clearAllSearches(sessionId);
      setHistory([]);
      setShowHistory(false);
    }
  };

  // Merge saved grants into result for exports
  const exportResult = savedGrants.length > 0
    ? { ...result, benefits: [...savedGrants, ...(result?.benefits || [])] }
    : result;

  const handleCopy = async () => {
    const text = resultToText(exportResult, answers);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownload = () => {
    const text = resultToText(exportResult, answers);
    downloadAsFile(text);
  };

  const handlePDF = () => {
    downloadAsPDF(exportResult, answers);
  };

  const handleSaveToDashboard = async (grant) => {
    if (!user) return;
    const id = await saveGrant({ userId: user.id, grant });
    if (id) {
      setDashboardSaved((prev) => ({ ...prev, [grant.name]: true }));
    }
  };

  const handleEmailSignup = async () => {
    if (!emailInput || !emailInput.includes("@")) {
      setEmailError("Ange en giltig e-postadress");
      return;
    }
    setEmailError(null);
    try {
      const { saveEmailSignup } = await import("../lib/supabase");
      await saveEmailSignup({
        sessionId,
        email: emailInput,
        answers,
      });
      setEmailSubmitted(true);
    } catch (err) {
      console.error("Email signup error:", err);
      setEmailError("Något gick fel. Försök igen.");
    }
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
            <div style={{
              display: "flex", justifyContent: "flex-end", marginBottom: 8,
            }}>
              <a
                href={user ? "/dashboard" : "/login"}
                style={{
                  padding: "5px 14px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#64748b", fontSize: 12, textDecoration: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}
              >{user ? "Min dashboard" : "Logga in"}</a>
            </div>
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
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#0a1628", fontFamily: "'Space Mono', monospace" }}>B</span>
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.2 }}>
                  Vilka bidrag kan<br />ditt företag få?
                </h2>
                <p style={{
                  fontSize: 15, color: "#94a3b8", lineHeight: 1.6,
                  maxWidth: 440, margin: "0 auto 12px",
                }}>
                  Svara på några snabba frågor så söker vår AI igenom hundratals
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

                {/* Prefill banner for returning users */}
                {showPrefillBanner && savedProfile && (
                  <div style={{
                    marginTop: 24, padding: "16px 20px", borderRadius: 12,
                    background: "rgba(167, 139, 250, 0.06)",
                    border: "1px solid rgba(167, 139, 250, 0.2)",
                    maxWidth: 440, margin: "24px auto 0",
                    textAlign: "left",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", marginBottom: 6 }}>
                      Välkommen tillbaka!
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>
                      Vi har dina svar från förra sökningen. Vill du använda dem igen?
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          const { kommun: savedKommun, ...quizAnswers } = savedProfile;
                          setAnswers(quizAnswers);
                          if (savedKommun) setKommun(savedKommun);
                          setShowPrefillBanner(false);
                          fetchResults(quizAnswers);
                        }}
                        style={{
                          padding: "8px 18px", borderRadius: 8,
                          background: "rgba(167, 139, 250, 0.15)",
                          border: "1px solid rgba(167, 139, 250, 0.3)",
                          color: "#a78bfa", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Sök med samma svar</button>
                      <button
                        onClick={() => {
                          setShowPrefillBanner(false);
                          transition(() => setStep(0));
                        }}
                        style={{
                          padding: "8px 18px", borderRadius: 8,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#64748b", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Börja om</button>
                    </div>
                  </div>
                )}

                <div style={{
                  marginTop: 32, display: "flex", justifyContent: "center", gap: 20,
                  fontSize: 12, color: "#475569", flexWrap: "wrap",
                }}>
                  <span>Säker i molnet</span>
                  <span>Tar 1 minut</span>
                  <span>AI-driven</span>
                </div>

                {/* History section */}
                {history.length > 0 && !showHistory && (
                  <button
                    onClick={() => setShowHistory(true)}
                    style={{
                      marginTop: 24, background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12, padding: "14px 24px",
                      color: "#64748b", fontSize: 13, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                      display: "inline-flex", alignItems: "center", gap: 8,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.3)";
                      e.currentTarget.style.color = "#94a3b8";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "#64748b";
                    }}
                  >
                    Visa tidigare sökningar ({history.length})
                  </button>
                )}

                {showHistory && (
                  <div style={{ marginTop: 24, textAlign: "left" }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 12,
                    }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#94a3b8" }}>
                        Tidigare sökningar
                      </h3>
                      <button
                        onClick={() => setShowHistory(false)}
                        style={{
                          background: "none", border: "none", color: "#64748b",
                          fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Dölj ✕</button>
                    </div>
                    <p style={{ fontSize: 11, color: "#475569", margin: "0 0 12px", lineHeight: 1.4 }}>
                      Sparas anonymt i din webbläsare. Ingen personlig data lagras.
                    </p>
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12, padding: "14px 16px",
                          marginBottom: 8, cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.3)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div
                            onClick={() => loadFromHistory(entry)}
                            style={{ flex: 1 }}
                          >
                            <div style={{
                              fontSize: 13, color: "#cbd5e1", fontWeight: 500,
                              marginBottom: 4, lineHeight: 1.4,
                            }}>
                              {entry.result?.summary
                                ? entry.result.summary.slice(0, 100) + (entry.result.summary.length > 100 ? "..." : "")
                                : "Sökning"}
                            </div>
                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#475569" }}>
                              <span>{entry.result?.benefits?.length || 0} bidrag</span>
                              {entry.result?.total_potential && (
                                <span style={{ color: "#10b981" }}>{entry.result.total_potential}</span>
                              )}
                              <span>{new Date(entry.created_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteHistory(entry.id); }}
                            style={{
                              background: "none", border: "none", color: "#475569",
                              fontSize: 14, cursor: "pointer", padding: "4px 8px",
                              borderRadius: 6, transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = "#475569"; }}
                            title="Ta bort"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleClearAllHistory}
                      style={{
                        marginTop: 8, width: "100%",
                        background: "rgba(239, 68, 68, 0.06)",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                        borderRadius: 10, padding: "10px",
                        color: "#ef4444", fontSize: 12, fontWeight: 500,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.06)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.15)";
                      }}
                    >Rensa all historik</button>
                  </div>
                )}
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
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginTop: 20, gap: 12,
                }}>
                  {step > 0 ? (
                    <button
                      onClick={() => transition(() => setStep(step - 1))}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12, padding: "12px 20px",
                        color: "#94a3b8", fontSize: 14, fontWeight: 500,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.2s",
                      }}
                    >← Tillbaka</button>
                  ) : <div />}
                  {current.multi && (
                    <button
                      onClick={() => handleMultiConfirm(current.id)}
                      disabled={multiSelect.length === 0}
                      style={{
                        flex: 1, maxWidth: 260,
                        background: multiSelect.length > 0
                          ? "linear-gradient(135deg, #38bdf8, #10b981)"
                          : "rgba(255,255,255,0.05)",
                        color: multiSelect.length > 0 ? "#0a1628" : "#475569",
                        border: "none", borderRadius: 12,
                        padding: "12px 20px", fontSize: 15, fontWeight: 600,
                        cursor: multiSelect.length > 0 ? "pointer" : "default",
                        fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                      }}
                    >Gå vidare →</button>
                  )}
                </div>
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
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#38bdf8", fontFamily: "'Space Mono', monospace" }}>{refining ? "..." : "?"}</span>
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

            {/* Daily limit reached */}
            {dailyLimitHit && !loading && !refining && (
              <div style={{
                textAlign: "center", padding: "40px 20px", marginBottom: 20,
                background: "rgba(251, 191, 36, 0.06)",
                border: "1px solid rgba(251, 191, 36, 0.2)",
                borderRadius: 14,
              }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>--</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fbbf24", margin: "0 0 12px" }}>
                  Daglig gräns nådd
                </h3>
                <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 20px", lineHeight: 1.6 }}>
                  {dailyLimitHit.message}
                </p>

                {!dailyLimitHit.loggedIn && (
                  <div style={{ marginBottom: 16 }}>
                    <a href="/login" style={{
                      display: "inline-block", padding: "12px 28px", borderRadius: 10,
                      background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      textDecoration: "none", fontWeight: 600, fontSize: 14,
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Logga in för fler sökningar
                    </a>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                      Inloggade användare får {5} sökningar per dag
                    </p>
                  </div>
                )}

                {dailyLimitHit.loggedIn && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: "inline-block", padding: "12px 28px", borderRadius: 10,
                      background: "rgba(16, 185, 129, 0.1)", color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      fontWeight: 600, fontSize: 14,
                    }}>
                      Premium kommer snart
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                      Obegränsad tillgång för en liten månadsavgift
                    </p>
                  </div>
                )}

                <p style={{ fontSize: 12, color: "#475569", marginTop: 16 }}>
                  Dina sökningar nollställs vid midnatt. Kom tillbaka imorgon!
                </p>
              </div>
            )}

            {/* Error */}
            {error && !dailyLimitHit && !loading && !refining && (
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
                {/* Badges row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {refineCount > 0 && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 20,
                      fontSize: 11, fontWeight: 600,
                      background: "rgba(167, 139, 250, 0.1)",
                      color: "#a78bfa",
                      border: "1px solid rgba(167, 139, 250, 0.25)",
                    }}>
                      Förfinad {refineCount} {refineCount === 1 ? "gång" : "gånger"}
                    </div>
                  )}
                  {usageInfo && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 20,
                      fontSize: 11, fontWeight: 600,
                      background: usageInfo.used >= usageInfo.limit - 1
                        ? "rgba(251, 191, 36, 0.1)"
                        : "rgba(255,255,255,0.04)",
                      color: usageInfo.used >= usageInfo.limit - 1 ? "#fbbf24" : "#64748b",
                      border: `1px solid ${usageInfo.used >= usageInfo.limit - 1
                        ? "rgba(251, 191, 36, 0.25)"
                        : "rgba(255,255,255,0.08)"}`,
                    }}>
                      {usageInfo.used} av {usageInfo.limit} sökningar idag
                    </div>
                  )}
                </div>

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

                {/* Kommun follow-up question */}
                {showKommunPrompt && !kommun && answers.region && KOMMUNER_BY_LAN[answers.region] && (
                  <div style={{
                    background: "rgba(56, 189, 248, 0.05)",
                    border: "1px solid rgba(56, 189, 248, 0.15)",
                    borderRadius: 14, padding: "16px 20px", marginBottom: 20,
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      marginBottom: 10,
                    }}>
                      <div>
                        <div style={{
                          fontSize: 10, color: "#38bdf8", textTransform: "uppercase",
                          letterSpacing: "0.5px", fontWeight: 600, marginBottom: 4,
                        }}>Valfri uppföljningsfråga</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                          Vilken kommun är företaget i?
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          Vissa bidrag (t.ex. från Arbetsförmedlingen) varierar beroende på kommun
                        </div>
                      </div>
                      <button
                        onClick={() => setShowKommunPrompt(false)}
                        style={{
                          background: "none", border: "none", color: "#475569",
                          cursor: "pointer", fontSize: 16, padding: "2px 6px",
                        }}
                        title="Stäng"
                      >x</button>
                    </div>
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180,
                      overflowY: "auto", paddingRight: 4,
                    }}>
                      {KOMMUNER_BY_LAN[answers.region].map((k) => (
                        <button
                          key={k}
                          onClick={() => {
                            setKommun(k);
                            setShowKommunPrompt(false);
                          }}
                          style={{
                            padding: "6px 12px", borderRadius: 8,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#cbd5e1", fontSize: 12, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                          }}
                        >{k}</button>
                      ))}
                      <button
                        onClick={() => {
                          setKommun("prefer_not_to_say");
                          setShowKommunPrompt(false);
                        }}
                        style={{
                          padding: "6px 12px", borderRadius: 8,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px dashed rgba(255,255,255,0.1)",
                          color: "#64748b", fontSize: 12, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif", fontStyle: "italic",
                        }}
                      >Vill inte säga</button>
                    </div>
                  </div>
                )}

                {/* Kommun selected badge */}
                {kommun && kommun !== "prefer_not_to_say" && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "6px 14px", borderRadius: 20, marginBottom: 16,
                    fontSize: 12, fontWeight: 500,
                    background: "rgba(56, 189, 248, 0.08)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                  }}>
                    Kommun: {kommun}
                    <button
                      onClick={() => { setKommun(null); setShowKommunPrompt(true); }}
                      style={{
                        background: "none", border: "none", color: "#64748b",
                        cursor: "pointer", fontSize: 14, padding: 0,
                      }}
                    >x</button>
                  </div>
                )}

                {/* Instruction */}
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 20,
                  background: "rgba(56, 189, 248, 0.04)",
                  border: "1px solid rgba(56, 189, 248, 0.1)",
                  fontSize: 13, color: "#64748b", lineHeight: 1.5,
                }}>
                  Markera vilka bidrag som passar dig. Skriv gärna frågor i kommentarsfältet — t.ex. "Gäller detta min bolagsform?"
                  Klicka sedan <strong style={{ color: "#a78bfa" }}>Förfina</strong> så får du svar och bättre rekommendationer.
                </div>

                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "baseline", marginBottom: 16, flexWrap: "wrap", gap: 8,
                }}>
                  <h3 style={{
                    fontSize: 14, fontWeight: 600, color: "#64748b",
                    textTransform: "uppercase", letterSpacing: "1px",
                    margin: 0, fontFamily: "'Space Mono', monospace",
                  }}>
                    {(result.benefits?.length || 0) + savedGrants.length} bidrag och stöd{savedGrants.length > 0 ? ` (${savedGrants.length} sparade)` : ""}
                  </h3>
                  <span style={{
                    fontSize: 11, color: "#475569", fontStyle: "italic",
                  }}>
                    Relevans = hur väl bidraget matchar din situation
                  </span>
                </div>

                {/* Saved grants from previous rounds */}
                {savedGrants.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "baseline", marginBottom: 12,
                    }}>
                      <h3 style={{
                        fontSize: 13, fontWeight: 600, color: "#10b981",
                        textTransform: "uppercase", letterSpacing: "1px",
                        margin: 0, fontFamily: "'Space Mono', monospace",
                      }}>
                        Dina sparade bidrag ({savedGrants.length})
                      </h3>
                      <span style={{ fontSize: 11, color: "#475569", fontStyle: "italic" }}>
                        Dessa har du redan markerat som aktuella
                      </span>
                    </div>
                    {savedGrants.map((benefit, i) => (
                      <div key={`saved-${i}`} style={{ position: "relative" }}>
                        <GrantCard
                          benefit={benefit}
                          index={`saved-${i}`}
                          feedback={undefined}
                          onFeedbackChange={() => {}}
                          saved
                        />
                        <button
                          onClick={() => setSavedGrants((prev) => prev.filter((_, j) => j !== i))}
                          style={{
                            position: "absolute", top: 12, right: 12,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6, padding: "3px 8px",
                            fontSize: 10, color: "#64748b", cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >Ta bort</button>
                      </div>
                    ))}
                    <div style={{
                      height: 1, background: "rgba(255,255,255,0.06)",
                      margin: "8px 0 20px",
                    }} />
                  </div>
                )}

                {/* New grant cards from AI */}
                {result.benefits?.map((benefit, i) => (
                  <GrantCard
                    key={`${refineCount}-${i}`}
                    benefit={benefit}
                    index={i}
                    feedback={feedback[i]}
                    onFeedbackChange={handleFeedbackChange}
                    onSaveToDashboard={user ? handleSaveToDashboard : null}
                    dashboardSaved={dashboardSaved[benefit.name]}
                  />
                ))}

                {/* Export buttons */}
                <div style={{
                  display: "flex", gap: 8, marginTop: 16,
                }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: copySuccess ? "#10b981" : "#64748b",
                      fontSize: 13, fontWeight: 500, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                    }}
                  >
                    {copySuccess ? "Kopierad!" : "Kopiera rapport"}
                  </button>
                  <button
                    onClick={handleDownload}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#64748b",
                      fontSize: 13, fontWeight: 500, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                    }}
                  >
                    Ladda ner .txt
                  </button>
                  <button
                    onClick={handlePDF}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#64748b",
                      fontSize: 13, fontWeight: 500, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                    }}
                  >
                    Ladda ner PDF
                  </button>
                </div>

                {/* Refine button */}
                <button
                  onClick={() => setShowRefineDialog(true)}
                  style={{
                    marginTop: 8, width: "100%",
                    background: hasFeedback
                      ? "linear-gradient(135deg, #a78bfa, #38bdf8)"
                      : "rgba(167, 139, 250, 0.15)",
                    color: hasFeedback ? "#0a1628" : "#a78bfa",
                    border: hasFeedback ? "none" : "1px solid rgba(167, 139, 250, 0.3)",
                    borderRadius: 12,
                    padding: "16px", fontSize: 15, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s",
                    boxShadow: hasFeedback ? "0 0 20px rgba(167, 139, 250, 0.2)" : "none",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    if (hasFeedback) e.currentTarget.style.boxShadow = "0 0 30px rgba(167, 139, 250, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    if (hasFeedback) e.currentTarget.style.boxShadow = "0 0 20px rgba(167, 139, 250, 0.2)";
                  }}
                >
                  Förfina rekommendationer
                </button>

                {/* Refine dialog */}
                {showRefineDialog && (
                  <div style={{
                    marginTop: 12, padding: "20px", borderRadius: 14,
                    background: "rgba(167, 139, 250, 0.06)",
                    border: "1px solid rgba(167, 139, 250, 0.2)",
                    animation: "fadeSlide 0.3s ease",
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: "#a78bfa", margin: "0 0 6px" }}>
                      Vill du berätta mer?
                    </h4>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 14px", lineHeight: 1.5 }}>
                      Beskriv gärna vad du letar efter, eller ställ en fråga. T.ex. "Jag vill veta mer om EU-bidrag",
                      "Vi planerar att anställa 3 personer snart", eller "Finns det stöd för export?".
                      Du kan också lämna tomt och klicka Förfina direkt.
                    </p>
                    <textarea
                      value={refineComment}
                      onChange={(e) => setRefineComment(e.target.value)}
                      placeholder="Valfritt: Beskriv vad du vill veta mer om..."
                      style={{
                        width: "100%", minHeight: 80, padding: "12px 14px",
                        borderRadius: 10, border: "1px solid rgba(167, 139, 250, 0.2)",
                        background: "rgba(255,255,255,0.03)", color: "#e2e8f0",
                        fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                        resize: "vertical", lineHeight: 1.5,
                        outline: "none",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.5)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.2)"; }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => {
                          setShowRefineDialog(false);
                          setRefineComment("");
                        }}
                        style={{
                          flex: 1, padding: "12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#94a3b8", fontSize: 14, fontWeight: 500,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Avbryt</button>
                      <button
                        onClick={() => {
                          refineResults(refineComment);
                          setRefineComment("");
                        }}
                        style={{
                          flex: 2, padding: "12px", borderRadius: 10,
                          background: "linear-gradient(135deg, #a78bfa, #38bdf8)",
                          color: "#0a1628", border: "none",
                          fontSize: 14, fontWeight: 700,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Förfina nu</button>
                    </div>
                  </div>
                )}

                {/* Recommendations section */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div style={{
                    marginTop: 24, padding: "20px", borderRadius: 14,
                    background: "rgba(251, 191, 36, 0.04)",
                    border: "1px solid rgba(251, 191, 36, 0.15)",
                  }}>
                    <h4 style={{
                      fontSize: 14, fontWeight: 600, color: "#fbbf24",
                      textTransform: "uppercase", letterSpacing: "1px",
                      margin: "0 0 14px", fontFamily: "'Space Mono', monospace",
                    }}>
                      Rekommendationer och nästa steg
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {result.recommendations.map((rec, i) => (
                        <div key={i} style={{
                          display: "flex", gap: 10, alignItems: "flex-start",
                          fontSize: 13, color: "#94a3b8", lineHeight: 1.6,
                        }}>
                          <span style={{
                            minWidth: 22, height: 22, borderRadius: 6,
                            background: "rgba(251, 191, 36, 0.1)",
                            border: "1px solid rgba(251, 191, 36, 0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, color: "#fbbf24",
                            fontFamily: "'Space Mono', monospace", flexShrink: 0,
                            marginTop: 1,
                          }}>{i + 1}</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Login CTA for non-logged-in users */}
                {!user && (
                  <div style={{
                    marginTop: 24, padding: "20px", borderRadius: 14,
                    background: "rgba(16, 185, 129, 0.04)",
                    border: "1px solid rgba(16, 185, 129, 0.15)",
                  }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: "#10b981", margin: "0 0 6px" }}>
                      Vill du spara dina bidrag?
                    </h4>
                    <p style={{
                      fontSize: 13, color: "#94a3b8", margin: "0 0 14px", lineHeight: 1.5,
                    }}>
                      Logga in med Google för att spara bidrag i din egen dashboard med checklistor,
                      deadlines och statushantering.
                    </p>
                    <a
                      href="/login"
                      style={{
                        display: "inline-block", padding: "10px 24px", borderRadius: 10,
                        background: "linear-gradient(135deg, #38bdf8, #10b981)",
                        color: "#0a1628", fontWeight: 700, fontSize: 14,
                        textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
                      }}
                    >Logga in och spara</a>
                  </div>
                )}

                {/* Email signup section */}
                <div style={{
                  marginTop: 24, padding: "24px", borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.06), rgba(16, 185, 129, 0.04))",
                  border: "1px solid rgba(56, 189, 248, 0.15)",
                }}>
                  <h4 style={{
                    fontSize: 15, fontWeight: 600, color: "#e2e8f0",
                    margin: "0 0 6px",
                  }}>
                    Vill du bli notifierad?
                  </h4>
                  <p style={{
                    fontSize: 13, color: "#64748b", margin: "0 0 16px", lineHeight: 1.5,
                  }}>
                    Bidragslandskapet förändras ständigt. Ange din e-post så påminner vi dig om 6 månader
                    att göra quizet igen, eller meddelar dig om nya bidrag som matchar din profil.
                  </p>
                  {emailSubmitted ? (
                    <div style={{
                      padding: "12px 16px", borderRadius: 10,
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      fontSize: 14, color: "#10b981", fontWeight: 500,
                    }}>
                      Tack! Vi hör av oss när det finns nyheter.
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="din@email.se"
                          style={{
                            flex: 1, padding: "12px 14px", borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.03)", color: "#e2e8f0",
                            fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                            outline: "none",
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEmailSignup(); }}
                        />
                        <button
                          onClick={handleEmailSignup}
                          style={{
                            padding: "12px 20px", borderRadius: 10,
                            background: "linear-gradient(135deg, #38bdf8, #10b981)",
                            color: "#0a1628", border: "none",
                            fontSize: 14, fontWeight: 600, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Påminn mig
                        </button>
                      </div>
                      {emailError && (
                        <p style={{ fontSize: 12, color: "#f87171", margin: "8px 0 0" }}>{emailError}</p>
                      )}
                      <p style={{
                        fontSize: 11, color: "#475569", margin: "10px 0 0", lineHeight: 1.4,
                      }}>
                        Vi skickar max 2-3 mail per år. Ingen spam. Du kan avregistrera dig när som helst.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: 24, padding: "16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 12, color: "#475569", lineHeight: 1.5, textAlign: "center",
                }}>
                  Informationen är vägledande och baseras på AI-analys.
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
                >Börja om från början</button>
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
              >Integritet</button>
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
              >Hur fungerar det?</button>
            </div>

            {infoPanel === "gdpr" && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "24px",
                animation: "fadeSlide 0.3s ease",
              }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#38bdf8" }}>
                  Integritet & GDPR
                </h4>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>Anonyma sessioner.</span>{" "}
                    Dina svar sparas kopplat till ett anonymt sessions-ID — inte ditt namn, IP-adress eller annan personlig information.
                    Sökhistoriken finns kvar så du kan se dina tidigare resultat.
                  </p>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>Ingen spårning.</span>{" "}
                    Inga cookies, inga analytics, inget spårningsskript. Vi spårar inte hur du använder sidan.
                  </p>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>E-post (valfritt).</span>{" "}
                    Om du väljer att ange din e-post för påminnelser lagras den i vår databas. Du kan avregistrera dig när som helst.
                    Vi delar aldrig din e-post med tredje part.
                  </p>
                  <p style={{ margin: "0 0 12px" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>AI-behandling.</span>{" "}
                    Dina anonyma svar skickas till Claude (Anthropic) för analys. Anthropic lagrar inte API-konversationer
                    och använder inte din data för att träna modeller.
                  </p>
                  <p style={{
                    margin: 0, padding: "12px 16px",
                    background: "rgba(56, 189, 248, 0.06)", borderRadius: 8,
                    border: "1px solid rgba(56, 189, 248, 0.1)",
                  }}>
                    <span style={{ fontWeight: 600, color: "#cbd5e1" }}>Kort sagt:</span>{" "}
                    Vi samlar inte in personuppgifter. Dina svar är anonyma. E-post sparas bara om du själv väljer att ange den.
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
                  Hur fungerar Bidragsguiden?
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
                      <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>Du svarar på några frågor</div>
                      Bolagsform, ålder, storlek, region, behov, omsättning, bransch och vad företaget erbjuder.
                      Du kan välja flera branscher och behov om det stämmer.
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
                      Tillväxtverket, Vinnova, Almi, Energimyndigheten, Arbetsförmedlingen, Försäkringskassan,
                      regionala stöd, EU-fonder, RUT/ROT och fler matchas mot din profil.
                      Varje bidrag får en relevansbedömning (hög, medel, låg) baserat på hur väl det matchar just ditt företag.
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
                      <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>Du ger feedback och ställer frågor</div>
                      Markera varje bidrag som "Kan vara aktuellt", "Vet ej" eller "Inte aktuellt".
                      Klicka sedan Förfina — där kan du även skriva egna frågor, t.ex.
                      "Finns det stöd för export?" eller "Berätta mer om EU-bidrag".
                      AI:n anpassar resultaten baserat på allt du skrivit.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: 8,
                      background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(167, 139, 250, 0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#a78bfa",
                      fontFamily: "'Space Mono', monospace",
                    }}>4</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>Spara och kom tillbaka</div>
                      Dina sökningar sparas automatiskt i din historik så du kan se dem igen.
                      Du kan ladda ner resultaten som PDF eller textfil.
                      Ange din e-post om du vill bli påmind om att söka igen om 6 månader.
                    </div>
                  </div>
                  <div style={{
                    padding: "14px 16px", background: "rgba(251, 191, 36, 0.06)",
                    borderRadius: 8, border: "1px solid rgba(251, 191, 36, 0.15)",
                  }}>
                    <div style={{ fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}>Viktigt att veta</div>
                    Bidragsguiden ger vägledning baserad på AI och ersätter inte professionell rådgivning.
                    Kontrollera alltid villkor och deadlines direkt hos respektive myndighet.
                    Bidragslandskapet förändras löpande — det kan vara värt att göra quizet igen om några månader.
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
