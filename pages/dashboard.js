import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { resultToText, downloadAsFile, downloadAsPDF } from "../lib/export";
import {
  getSavedGrants,
  updateGrantStatus,
  updateGrantNotes,
  updateGrantDeadline,
  deleteSavedGrant,
  toggleChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
  exportUserData,
  getQuizAnswers,
  getUserSearches,
  deleteUserSearch,
  saveDraftSection,
  getEvents,
  saveEvent,
  toggleEventPlan,
  deleteEvent,
} from "../lib/dashboard";

const STATUS_CONFIG = {
  new: { label: "Ny", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  investigating: { label: "Undersöker", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  applying: { label: "Ansökan", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  applied: { label: "Ansökt", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  granted: { label: "Beviljad", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  rejected: { label: "Nekad", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  archived: { label: "Arkiverad", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
};

const SIDEBAR_W = 240;

const NEXT_STEPS = {
  new: { tip: "Läs igenom bidraget och kolla om du uppfyller kraven.", action: "Ändra status till 'Undersöker' när du börjar kolla" },
  investigating: { tip: "Samla ihop de dokument som krävs och kontrollera alla villkor.", action: "Ändra till 'Ansökan' när du börjar skriva ansökan" },
  applying: { tip: "Slutför din ansökan och dubbelkolla alla bilagor innan du skickar.", action: "Ändra till 'Ansökt' när du skickat in" },
  applied: { tip: "Bra jobbat! Nu är det bara att vänta på svar.", action: "Uppdatera till 'Beviljad' eller 'Nekad' när du fått besked" },
  granted: { tip: "Grattis! Följ villkoren och rapportera enligt krav.", action: "Arkivera när bidraget är slutredovisat" },
  rejected: { tip: "Kolla om du kan söka igen nästa period eller hitta alternativ.", action: "Gör ett nytt quiz för att hitta fler bidrag" },
  archived: { tip: "Detta bidrag är arkiverat.", action: "" },
};

const RESOURCES = [
  { category: "Statliga myndigheter", links: [
    { name: "Tillväxtverket", url: "https://tillvaxtverket.se/bidrag", desc: "Regionalt investeringsstöd, konsultcheckar, EU-fonder" },
    { name: "Vinnova", url: "https://vinnova.se/sok-finansiering", desc: "Innovationsbidrag, förstudier, samverkansprojekt" },
    { name: "Energimyndigheten", url: "https://energimyndigheten.se/forskning-innovation", desc: "Klimatpremien, energieffektivisering, Industriklivet" },
    { name: "Naturvårdsverket / Klimatklivet", url: "https://naturvardsverket.se/klimatklivet", desc: "Investeringsstöd för lokala klimatåtgärder" },
    { name: "Jordbruksverket", url: "https://jordbruksverket.se/stod", desc: "Jordbruk, landsbygdsutveckling, livsmedel" },
    { name: "Arbetsförmedlingen", url: "https://arbetsformedlingen.se/for-arbetsgivare/stod-och-bidrag", desc: "Nystartsjobb, lönebidrag, starta eget-bidrag" },
  ]},
  { category: "Rådgivning och stöd", links: [
    { name: "Almi", url: "https://almi.se", desc: "Företagslån, rådgivning, mentorskap, innovationslån" },
    { name: "Verksamt.se", url: "https://verksamt.se", desc: "Samlad info om att starta och driva företag" },
    { name: "NyföretagarCentrum", url: "https://nyforetagarcentrum.se", desc: "Gratis rådgivning för nya företagare" },
    { name: "Business Sweden", url: "https://business-sweden.com", desc: "Exportstöd, internationaliseringscheckar" },
  ]},
  { category: "EU-fonder", links: [
    { name: "Horizon Europe", url: "https://ec.europa.eu/info/horizon-europe", desc: "EU:s största forsknings- och innovationsprogram" },
    { name: "EIC Accelerator", url: "https://eic.ec.europa.eu", desc: "Bidrag + investering för innovativa SME:s" },
    { name: "EU-programguiden", url: "https://tillvaxtverket.se/eu-program", desc: "Tillväxtverkets guide till EU-fonder i Sverige" },
  ]},
  { category: "Skattelättnader", links: [
    { name: "Växastödet (Skatteverket)", url: "https://skatteverket.se/foretag/arbetsgivare/vaxastod", desc: "Halverad arbetsgivaravgift för enskild firma med första anställd" },
    { name: "FoU-avdrag", url: "https://skatteverket.se/foretag/arbetsgivare/socialavgifter/nedsattningfou", desc: "Sänkt arbetsgivaravgift för forskning och utveckling" },
    { name: "RUT / ROT", url: "https://skatteverket.se/privat/fastigheterochbostad/rotochrutarbete", desc: "Skattereduktion för hushålls- och byggtjänster" },
  ]},
];

// --- Visual helper components ---

const CATEGORY_COLORS = {
  "innovation": { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "klimat": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "miljö": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "digital": { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  "export": { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "hållbar": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "personal": { bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" },
  "forsk": { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "energi": { bg: "#fefce8", color: "#ca8a04", border: "#fef08a" },
  "jordbruk": { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "bygg": { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
  "tech": { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  "handel": { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
};

function getCategoryStyle(category) {
  if (!category) return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  const lower = category.toLowerCase();
  for (const [key, style] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key)) return style;
  }
  return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
}

function MatchScoreCircle({ score, size = 44 }) {
  if (score === null || score === undefined) return null;
  const color = score >= 80 ? "#059669" : score >= 60 ? "#f59e0b" : "#94a3b8";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `conic-gradient(${color} ${score * 3.6}deg, #e8ecf1 0deg)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: size - 6, height: size - 6, borderRadius: "50%", background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size < 36 ? 9 : 11, fontWeight: 700, color,
      }}>{score}%</div>
    </div>
  );
}

function GrantProgressBar({ value, color = "#3b82f6", h = 4 }) {
  return (
    <div style={{ height: h, background: "#e8ecf1", borderRadius: h, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(value, 100)}%`, background: color, borderRadius: h, transition: "width 0.5s ease" }} />
    </div>
  );
}

function DeadlineBadge({ days }) {
  if (days === null || days === undefined) return <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, background: "#dbeafe", padding: "2px 8px", borderRadius: 4 }}>Löpande</span>;
  if (days < 0) return <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, background: "#fef2f2", padding: "2px 8px", borderRadius: 4 }}>Stängd</span>;
  if (days <= 14) return <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, background: "#fef2f2", padding: "2px 8px", borderRadius: 4 }}>{days} dagar kvar</span>;
  if (days <= 30) return <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600, background: "#fef3c7", padding: "2px 8px", borderRadius: 4 }}>{days} dagar</span>;
  return <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{days} dagar</span>;
}

function PriorityDot({ priority }) {
  if (!priority) return null;
  const c = priority === "high" ? "#dc2626" : priority === "medium" ? "#f59e0b" : "#94a3b8";
  const label = priority === "high" ? "Hög" : priority === "medium" ? "Medel" : "Låg";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      <span style={{ fontSize: 10, color: c, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function DayCounter({ days, size = 64 }) {
  const color = days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "#059669";
  const bg = days <= 7 ? "#fef2f2" : days <= 30 ? "#fffbeb" : "#ecfdf5";
  const border = days <= 7 ? "#fecaca" : days <= 30 ? "#fde68a" : "#a7f3d0";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, border: `2px solid ${border}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: size > 56 ? 20 : 16, fontWeight: 700, color, lineHeight: 1 }}>{days}</div>
      <div style={{ fontSize: 8, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>DAGAR</div>
    </div>
  );
}

function getGrantScore(grant) {
  if (grant.match_score) return grant.match_score;
  const gd = grant.grant_data || {};
  if (gd.match_score) return gd.match_score;
  // Deterministic score based on grant name
  let hash = 0;
  const name = grant.grant_name || "";
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const base = gd.priority === "high" ? 82 : gd.priority === "medium" ? 66 : 52;
  return base + (Math.abs(hash) % 14);
}

const PIPELINE_ICONS = {
  new: "\u25CB",
  investigating: "\u25CE",
  applying: "\u270E",
  applied: "\u2794",
  granted: "\u2713",
  rejected: "\u2717",
};

// --- Sub-components ---

function GrantCard({ grant, onUpdate, onDelete, userId }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(grant.notes || "");
  const [newItem, setNewItem] = useState("");
  const [deadline, setDeadline] = useState(grant.deadline || "");
  const [checklist, setChecklist] = useState(grant.bg_checklist_items || []);

  const st = STATUS_CONFIG[grant.status] || STATUS_CONFIG.new;
  const grantData = grant.grant_data || {};
  const doneCount = checklist.filter((c) => c.done).length;

  const handleStatusChange = async (status) => {
    await updateGrantStatus({ grantId: grant.id, status });
    onUpdate();
  };
  const handleNotesBlur = async () => {
    if (notes !== (grant.notes || "")) {
      await updateGrantNotes({ grantId: grant.id, notes });
    }
  };
  const handleDeadlineChange = async (val) => {
    setDeadline(val);
    await updateGrantDeadline({ grantId: grant.id, deadline: val || null });
    onUpdate();
  };
  const handleToggle = async (item) => {
    const newDone = !item.done;
    setChecklist((prev) => prev.map((c) => c.id === item.id ? { ...c, done: newDone } : c));
    await toggleChecklistItem({ itemId: item.id, done: newDone });
  };
  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    const item = await addChecklistItem({ savedGrantId: grant.id, userId, label: newItem.trim() });
    if (item) { setChecklist((prev) => [...prev, item]); setNewItem(""); }
  };
  const handleDeleteItem = async (itemId) => {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    await deleteChecklistItem(itemId);
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6,
      marginBottom: 8, borderLeft: `3px solid ${st.color}`,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", padding: "14px 16px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{grant.grant_name}</div>
            <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 2 }}>{grant.grant_agency}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: st.color, background: st.bg,
              padding: "2px 8px", borderRadius: 4, border: `1px solid ${st.border}`,
            }}>{st.label}</span>
            {doneCount > 0 && <span style={{ fontSize: 11, color: "#94a3b8" }}>{doneCount}/{checklist.length}</span>}
            <span style={{ fontSize: 11, color: "#cbd5e1" }}>{expanded ? "\u25B2" : "\u25BC"}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
          {grantData.amount && <span>Belopp: {grantData.amount}</span>}
          {deadline && (
            <span style={{ color: new Date(deadline) < new Date() ? "#dc2626" : "#d97706" }}>
              Deadline: {new Date(deadline).toLocaleDateString("sv-SE")}
            </span>
          )}
          {grantData.category && <span>{grantData.category}</span>}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f1f5f9" }}>
          {grantData.description && (
            <p style={{ fontSize: 13, color: "#475569", margin: "12px 0", lineHeight: 1.6 }}>{grantData.description}</p>
          )}
          {/* Nästa steg tips */}
          {NEXT_STEPS[grant.status] && NEXT_STEPS[grant.status].tip && (
            <div style={{
              padding: "10px 12px", borderRadius: 4, marginBottom: 12,
              background: "#eff6ff", border: "1px solid #bfdbfe", borderLeft: "3px solid #3b82f6",
            }}>
              <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 700 }}>Nästa steg</div>
              <div style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>{NEXT_STEPS[grant.status].tip}</div>
              {NEXT_STEPS[grant.status].action && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{NEXT_STEPS[grant.status].action}</div>
              )}
            </div>
          )}
          {grantData.eligibility_summary && (
            <div style={{ padding: "10px 12px", borderRadius: 4, marginBottom: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 600 }}>Vem kan söka</div>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{grantData.eligibility_summary}</div>
            </div>
          )}
          {grantData.url && (
            <a href={grantData.url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", fontSize: 12, color: "#3b82f6", textDecoration: "none", fontWeight: 500, marginBottom: 14,
            }}>Läs mer hos {grant.grant_agency} &rarr;</a>
          )}
          {/* Status selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleStatusChange(key)} style={{
                  padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  background: grant.status === key ? cfg.bg : "#f8fafc",
                  border: `1px solid ${grant.status === key ? cfg.border : "#e2e8f0"}`,
                  color: grant.status === key ? cfg.color : "#94a3b8",
                }}>{cfg.label}</button>
              ))}
            </div>
          </div>
          {/* Deadline */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Deadline</div>
            <input type="date" value={deadline} onChange={(e) => handleDeadlineChange(e.target.value)} style={{
              padding: "6px 10px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }} />
          </div>
          {/* Checklist */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Checklista ({doneCount}/{checklist.length})
            </div>
            {checklist.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
                <input type="checkbox" checked={item.done} onChange={() => handleToggle(item)} style={{ marginTop: 2, cursor: "pointer", accentColor: "#059669" }} />
                <span style={{ flex: 1, fontSize: 13, color: item.done ? "#94a3b8" : "#334155", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                <button onClick={() => handleDeleteItem(item.id)} style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: 13, cursor: "pointer", padding: "0 4px" }}
                  onMouseOver={(e) => { e.currentTarget.style.color = "#dc2626"; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = "#cbd5e1"; }}
                >x</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
                placeholder="Lägg till punkt..." style={{
                  flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                }} />
              <button onClick={handleAddItem} style={{
                padding: "6px 12px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#3b82f6", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>+</button>
            </div>
          </div>
          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Anteckningar</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleNotesBlur}
              placeholder="Skriv anteckningar..." style={{
                width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: 4, border: "1px solid #e2e8f0",
                background: "#fff", color: "#334155", fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: "vertical", lineHeight: 1.5,
              }} />
          </div>
          <button onClick={() => { if (confirm("Vill du ta bort detta bidrag?")) onDelete(grant.id); }} style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, padding: "6px 12px",
            color: "#dc2626", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>Ta bort</button>
        </div>
      )}
    </div>
  );
}

const QUIZ_LABELS = {
  company_type: { _title: "Bolagsform", enskild_firma: "Enskild firma", handelsbolag: "HB", kommanditbolag: "KB", aktiebolag: "AB", ekonomisk_forening: "Ekonomisk förening", ideell_forening: "Ideell förening", planning: "Planerar att starta" },
  company_age: { _title: "Ålder", not_started: "Inte startat", less_1y: "< 1 år", "1_3y": "1-3 år", "3_5y": "3-5 år", over_5y: "5+ år" },
  employees: { _title: "Anställda", solo: "0 (solo)", micro: "1-9", small: "10-49", medium: "50-249", large: "250+" },
  region: { _title: "Län", stockholm: "Stockholm", vastra_gotaland: "Västra Götaland", skane: "Skåne", ostergotland: "Östergötland", uppsala: "Uppsala", jonkoping: "Jönköping", halland: "Halland", orebro: "Örebro", sodermanland: "Södermanland", dalarna: "Dalarna", gavleborg: "Gävleborg", varmland: "Värmland", vastmanland: "Västmanland", norrbotten: "Norrbotten", vasterbotten: "Västerbotten", vasternorrland: "Västernorrland", jamtland: "Jämtland", kalmar: "Kalmar", kronoberg: "Kronoberg", blekinge: "Blekinge", gotland: "Gotland", prefer_not_to_say: "Ej angivet" },
  revenue: { _title: "Omsättning", zero: "Ingen", under_300k: "< 300k", "300k_600k": "300-600k", "600k_3m": "600k-3m", "3m_10m": "3-10m", "10m_50m": "10-50m", over_50m: "50m+", prefer_not_to_say: "Ej angivet", under_500k: "< 500k", "500k_3m": "500k-3m" },
  industry: { _title: "Bransch", tech: "Tech/IT", ecommerce: "Handel", manufacturing: "Tillverkning", construction: "Bygg", cleaning_facility: "Städ/Fastighet", hospitality: "Restaurang", health: "Hälsa/Vård", beauty_personal: "Skönhet", transport: "Transport", automotive: "Fordon", consulting: "Konsult", creative: "Kreativ/Kultur", agriculture: "Jordbruk", energy: "Energi", education: "Utbildning", other: "Annat" },
  offering_type: { _title: "Erbjudande", physical_products: "Produkter", services: "Tjänster", both: "Både och", unsure: "Osäkert" },
  needs: { _title: "Behov", investment: "Investering", product_dev: "Produktutveckling", export: "Export", digitalization: "Digitalisering", sustainability: "Hållbarhet", hiring_skills: "Personal", marketing_sales: "Marknadsföring", startup_support: "Starta eget", rnd: "Forskning", premises: "Lokaler", ip_patents: "Patent", finance_liquidity: "Ekonomi", pivot: "Omställning", unsure: "Osäkert" },
};

function getAnswerLabel(key, value) {
  const map = QUIZ_LABELS[key];
  if (!map) return String(value);
  if (Array.isArray(value)) return value.map((v) => map[v] || v).join(", ");
  return map[value] || String(value);
}

function SearchHistoryCard({ search, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const answers = search.answers || {};
  const result = search.result || {};
  const grantCount = result.benefits?.length || 0;
  const date = new Date(search.created_at).toLocaleDateString("sv-SE", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleDownloadPDF = () => { if (result?.benefits) downloadAsPDF(result, answers); };
  const handleDownloadTXT = () => {
    if (result?.benefits) {
      const text = resultToText(result, answers);
      downloadAsFile(text, `bidragsguiden-${new Date(search.created_at).toISOString().slice(0, 10)}.txt`);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 6 }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        cursor: "pointer", padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {getAnswerLabel("industry", answers.industry) || "Sökning"}{" "}
            {answers.region && <span style={{ color: "#64748b", fontWeight: 400 }}>i {getAnswerLabel("region", answers.region)}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {date} -- {grantCount} bidrag{search.refine_count > 0 ? `, förfinad ${search.refine_count}x` : ""}
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#cbd5e1" }}>{expanded ? "\u25B2" : "\u25BC"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 12px", borderTop: "1px solid #f1f5f9" }}>
          {result.summary && <p style={{ fontSize: 13, color: "#475569", margin: "10px 0", lineHeight: 1.6 }}>{result.summary}</p>}
          {result.benefits?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 600 }}>Bidrag</div>
              {result.benefits.slice(0, 5).map((b, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f8fafc", fontSize: 12 }}>
                  <span style={{ color: "#334155" }}>{b.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: b.priority === "high" ? "#059669" : b.priority === "medium" ? "#3b82f6" : "#94a3b8" }}>
                    {b.priority === "high" ? "Hög" : b.priority === "medium" ? "Medel" : "Låg"}
                  </span>
                </div>
              ))}
              {result.benefits.length > 5 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>+{result.benefits.length - 5} till...</div>}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "Sök igen", href: `/?prefill=history&searchId=${search.id}`, isLink: true, bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
              { label: "PDF", onClick: handleDownloadPDF, bg: "#f8fafc", border: "#e2e8f0", color: "#334155" },
              { label: "TXT", onClick: handleDownloadTXT, bg: "#f8fafc", border: "#e2e8f0", color: "#334155" },
              { label: "Ta bort", onClick: () => { if (confirm("Ta bort denna sökning?")) onDelete(search.id); }, bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
            ].map((btn) => btn.isLink ? (
              <a key={btn.label} href={btn.href} style={{
                padding: "5px 12px", borderRadius: 4, background: btn.bg, border: `1px solid ${btn.border}`,
                color: btn.color, fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
              }}>{btn.label}</a>
            ) : (
              <button key={btn.label} onClick={btn.onClick} style={{
                padding: "5px 12px", borderRadius: 4, background: btn.bg, border: `1px solid ${btn.border}`,
                color: btn.color, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>{btn.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const { user, profile, loading, signOut, updateProfile, deleteAccount } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [grants, setGrants] = useState([]);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [detailGrantId, setDetailGrantId] = useState(null);
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [searches, setSearches] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [draftGrant, setDraftGrant] = useState(null);
  const [draftSection, setDraftSection] = useState("problem");
  const [draftText, setDraftText] = useState("");
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const loadGrants = useCallback(async () => {
    if (!user) return;
    setLoadingGrants(true);
    try {
      const [grantsData, quizProfile, userSearches, userEvents] = await Promise.all([
        getSavedGrants(user.id),
        getQuizAnswers(user.id),
        getUserSearches(user.id),
        getEvents(user.id),
      ]);
      setGrants(grantsData);
      setQuizData(quizProfile);
      setSearches(userSearches);
      setEvents(userEvents);
      setEventsLoaded(true);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      showToast("Kunde inte ladda data. Försök ladda om sidan.", "error");
    } finally {
      setLoadingGrants(false);
    }
  }, [user]);

  useEffect(() => { if (user) loadGrants(); }, [user, loadGrants]);

  const handleDelete = async (grantId) => {
    await deleteSavedGrant(grantId);
    setGrants((prev) => prev.filter((g) => g.id !== grantId));
  };
  const handleDeleteSearch = async (searchId) => {
    await deleteUserSearch(searchId);
    setSearches((prev) => prev.filter((s) => s.id !== searchId));
  };

  const handleDownloadAllPDF = () => {
    if (grants.length === 0) return;
    downloadAsPDF({
      benefits: grants.map((g) => ({ name: g.grant_name, agency: g.grant_agency || "", ...(g.grant_data || {}) })),
      summary: `Du har ${grants.length} sparade bidrag.`,
      total_potential: "", recommendations: [],
    }, {});
  };
  const handleDownloadAllTXT = () => {
    if (grants.length === 0) return;
    const text = resultToText({
      benefits: grants.map((g) => ({ name: g.grant_name, agency: g.grant_agency || "", ...(g.grant_data || {}) })),
      summary: `Du har ${grants.length} sparade bidrag.`,
    }, {});
    downloadAsFile(text, `bidragsguiden-sparade-${new Date().toISOString().slice(0, 10)}.txt`);
  };
  const handleExportCSV = () => {
    if (grants.length === 0) return;
    const headers = ["Bidrag", "Myndighet", "Status", "Belopp", "Deadline", "Kategori", "Checklista", "Anteckningar"];
    const rows = grants.map((g) => {
      const d = g.grant_data || {};
      const items = g.bg_checklist_items || [];
      return [g.grant_name, g.grant_agency || "", STATUS_CONFIG[g.status]?.label || g.status, d.amount || "", g.deadline || "", d.category || "", `${items.filter((c) => c.done).length}/${items.length}`, (g.notes || "").replace(/\n/g, " ")];
    });
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bidragsguiden-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{
          width: 32, height: 32, border: "3px solid #e2e8f0",
          borderTop: "3px solid #3b82f6", borderRadius: "50%",
          animation: "dashSpin 0.8s linear infinite",
        }} />
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Laddar...</span>
        <style>{`@keyframes dashSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const upcomingDeadlines = grants
    .filter((g) => g.deadline && new Date(g.deadline) >= new Date() && g.status !== "archived" && g.status !== "rejected")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

  const statusCounts = {};
  grants.forEach((g) => { statusCounts[g.status] = (statusCounts[g.status] || 0) + 1; });

  // --- Sidebar ---
  const navItems = [
    { key: "overview", label: "Översikt" },
    { key: "grants", label: "Mina bidrag", count: grants.length },
    { key: "pipeline", label: "Pipeline" },
    { key: "timeline", label: "Tidslinje" },
    { key: "events", label: "Händelser", count: events.length || null },
    { key: "ai-draft", label: "AI Ansökan", pro: true },
    { key: "searches", label: "Sökhistorik", count: searches.length },
    { key: "profile", label: "Företagsprofil" },
    { key: "resources", label: "Resurser" },
  ];

  const sidebarContent = (
    <div style={{
      width: SIDEBAR_W, background: "#1e293b", height: "100vh",
      position: "fixed", left: 0, top: 0,
      display: "flex", flexDirection: "column", zIndex: 100,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #3b82f6, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>B</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Bidragsguiden</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {navItems.map((item) => {
          const active = activeSection === item.key;
          return (
            <button key={item.key} onClick={() => { setActiveSection(item.key); if (isMobile) setSidebarOpen(false); }} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 20px",
              background: active ? "rgba(255,255,255,0.05)" : "transparent",
              border: "none", borderLeft: active ? "3px solid #3b82f6" : "3px solid transparent",
              color: active ? "#f1f5f9" : "#94a3b8",
              fontSize: 13, fontWeight: active ? 600 : 400,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {item.label}
                {item.pro && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 700, letterSpacing: "0.05em" }}>PRO</span>
                )}
              </span>
              {item.count > 0 && (
                <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.06)", padding: "1px 7px", borderRadius: 8 }}>{item.count}</span>
              )}
            </button>
          );
        })}

        <div style={{ padding: "16px 20px 0" }}>
          <a href="/" style={{
            display: "block", padding: "9px 16px", borderRadius: 6,
            background: "#3b82f6", color: "#fff",
            fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center",
            fontFamily: "'DM Sans', sans-serif",
          }}>Gör nytt quiz</a>
        </div>
      </nav>

      {/* User menu with avatar dropdown */}
      <div ref={userMenuRef} style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            background: userMenuOpen ? "rgba(255,255,255,0.05)" : "transparent",
            border: "none", borderRadius: 6, padding: "8px 6px",
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseOver={(e) => { if (!userMenuOpen) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseOut={(e) => { if (!userMenuOpen) e.currentTarget.style.background = "transparent"; }}
        >
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {(profile?.display_name || profile?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile?.display_name || "Mitt konto"}
            </div>
            <div style={{ fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile?.email || user?.email || ""}
            </div>
          </div>
          {/* Chevron */}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: userMenuOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown menu */}
        {userMenuOpen && (
          <div style={{
            position: "absolute", bottom: "100%", left: 12, right: 12,
            background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "4px 0", marginBottom: 4,
            boxShadow: "0 -4px 16px rgba(0,0,0,0.3)",
          }}>
            <button onClick={() => { setActiveSection("profile"); setUserMenuOpen(false); if (isMobile) setSidebarOpen(false); }} style={{
              display: "block", width: "100%", padding: "9px 16px", textAlign: "left",
              background: "none", border: "none", color: "#e2e8f0", fontSize: 12,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
            >Mitt konto</button>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
            <button onClick={() => { signOut(); setUserMenuOpen(false); }} style={{
              display: "block", width: "100%", padding: "9px 16px", textAlign: "left",
              background: "none", border: "none", color: "#94a3b8", fontSize: 12,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
            >Logga ut</button>
          </div>
        )}
      </div>
    </div>
  );

  // --- Sections ---

  const renderOverview = () => (
    <>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Totalt", value: grants.length, color: "#0f172a", bg: "#fff" },
          { label: "Nya", value: statusCounts.new || 0, color: "#2563eb", bg: "#eff6ff" },
          { label: "Undersöker", value: statusCounts.investigating || 0, color: "#d97706", bg: "#fffbeb" },
          { label: "Ansökt", value: (statusCounts.applied || 0) + (statusCounts.applying || 0), color: "#7c3aed", bg: "#f5f3ff" },
          { label: "Beviljade", value: statusCounts.granted || 0, color: "#059669", bg: "#ecfdf5" },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg, border: "1px solid #e2e8f0", borderRadius: 8,
            padding: "16px 12px", textAlign: "center",
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Company profile from quiz */}
      {(() => {
        const qa = quizData?.quiz_answers || {};
        const profileFields = ["company_type", "region", "industry", "needs", "revenue", "employees"];
        const hasProfile = profileFields.some((k) => qa[k]);
        if (!hasProfile) return (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>Din företagsprofil</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Gör quizet för att få personliga rekommendationer.</div>
            </div>
            <a href="/" style={{
              padding: "8px 16px", borderRadius: 6, background: "#3b82f6", color: "#fff",
              fontWeight: 600, textDecoration: "none", fontSize: 12, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
            }}>Starta quiz</a>
          </div>
        );
        return (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "20px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Din företagsprofil</div>
              <a href="/" style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Uppdatera profil &rarr;</a>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {profileFields.map((key) => {
                if (!qa[key]) return null;
                const label = getAnswerLabel(key, qa[key]);
                const title = QUIZ_LABELS[key]?._title || key;
                return (
                  <div key={key} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", borderRadius: 6,
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                  }}>
                    <span style={{ color: "#94a3b8", fontWeight: 600 }}>{title}:</span>
                    <span style={{ color: "#334155", fontWeight: 500 }}>{label}</span>
                  </div>
                );
              })}
              {qa.kommun && qa.kommun !== "prefer_not_to_say" && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 6,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>Kommun:</span>
                  <span style={{ color: "#334155", fontWeight: 500 }}>{qa.kommun}</span>
                </div>
              )}
            </div>
            {quizData?.last_search_at && (
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 10 }}>
                Senast sökt: {new Date(quizData.last_search_at).toLocaleDateString("sv-SE")}
              </div>
            )}
          </div>
        );
      })()}

      {/* Deadline warnings + quick summary */}
      {(() => {
        const overdue = grants.filter((g) => g.deadline && new Date(g.deadline) < new Date() && g.status !== "archived" && g.status !== "rejected" && g.status !== "granted");
        const urgent = upcomingDeadlines.filter((g) => { const d = Math.ceil((new Date(g.deadline) - new Date()) / 86400000); return d <= 7; });
        const soon = upcomingDeadlines.filter((g) => { const d = Math.ceil((new Date(g.deadline) - new Date()) / 86400000); return d > 7 && d <= 30; });

        return (overdue.length > 0 || urgent.length > 0) ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Kräver uppmärksamhet</div>
            {overdue.map((g) => (
              <div key={g.id} style={{ fontSize: 12, color: "#991b1b", padding: "3px 0" }}>
                {g.grant_name} -- deadline har passerat ({new Date(g.deadline).toLocaleDateString("sv-SE")})
              </div>
            ))}
            {urgent.map((g) => {
              const days = Math.ceil((new Date(g.deadline) - new Date()) / 86400000);
              return (
                <div key={g.id} style={{ fontSize: 12, color: "#dc2626", padding: "3px 0" }}>
                  {g.grant_name} -- {days} {days === 1 ? "dag" : "dagar"} kvar till deadline
                </div>
              );
            })}
          </div>
        ) : null;
      })()}

      {/* Two-column layout: Deadlines + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Left: Kommande deadlines with circular counters */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>Kommande deadlines</div>
          {upcomingDeadlines.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>Inga kommande deadlines</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {upcomingDeadlines.map((g) => {
                const days = Math.ceil((new Date(g.deadline) - new Date()) / 86400000);
                const st = STATUS_CONFIG[g.status] || STATUS_CONFIG.new;
                return (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <DayCounter days={days} size={52} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.grant_name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{g.grant_agency || ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {new Date(g.deadline).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        }}>{st.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Senaste aktivitet */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>Senaste aktivitet</div>
          {(() => {
            const activities = [];
            grants.forEach((g) => {
              activities.push({
                text: g.status === "new" ? `Sparat bidrag: ${g.grant_name}` : `${g.grant_name}: ${STATUS_CONFIG[g.status]?.label || g.status}`,
                date: g.updated_at || g.created_at,
                color: STATUS_CONFIG[g.status]?.color || "#64748b",
              });
            });
            searches.forEach((s) => {
              activities.push({ text: "Sökning genomförd", date: s.created_at, color: "#3b82f6" });
            });
            activities.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (activities.length === 0) return <div style={{ fontSize: 13, color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>Ingen aktivitet ännu</div>;
            return activities.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < Math.min(activities.length, 8) - 1 ? "1px solid #f8fafc" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 4 }} />
                  {i < Math.min(activities.length, 8) - 1 && <div style={{ width: 1, flex: 1, background: "#e2e8f0", marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    {new Date(a.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Summary */}
      {(grants.length > 0 || searches.length > 0) && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Sammanfattning</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {grants.length > 0 && (
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                Du har {grants.length} sparade bidrag{statusCounts.investigating ? `, varav ${statusCounts.investigating} under utredning` : ""}{statusCounts.applied ? ` och ${statusCounts.applied} inskickade` : ""}.
              </div>
            )}
            {searches.length > 0 && (
              <div style={{ fontSize: 12, color: "#475569" }}>
                {searches.length} {searches.length === 1 ? "sökning" : "sökningar"} gjorda.
                {searches[0] && ` Senast: ${new Date(searches[0].created_at).toLocaleDateString("sv-SE")}`}
              </div>
            )}
            {grants.filter((g) => (g.bg_checklist_items || []).length > 0).length > 0 && (() => {
              const totalItems = grants.reduce((sum, g) => sum + (g.bg_checklist_items || []).length, 0);
              const doneItems = grants.reduce((sum, g) => sum + (g.bg_checklist_items || []).filter((c) => c.done).length, 0);
              return totalItems > 0 ? (
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Checklista: {doneItems}/{totalItems} punkter avklarade.
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Recent grants */}
      {grants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Senaste bidrag</div>
            <button onClick={() => setActiveSection("grants")} style={{
              background: "none", border: "none", color: "#3b82f6", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            }}>Visa alla &rarr;</button>
          </div>
          {grants.slice(0, 5).map((grant) => (
            <GrantCard key={grant.id} grant={grant} onUpdate={loadGrants} onDelete={handleDelete} userId={user.id} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {grants.length === 0 && !loadingGrants && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#64748b", marginBottom: 6 }}>Du har inga sparade bidrag ännu.</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Gör quizet för att hitta bidrag som passar ditt företag.</div>
          <a href="/" style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 6,
            background: "#3b82f6", color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          }}>Gör nytt quiz</a>
        </div>
      )}

      {loadingGrants && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 13 }}>Laddar...</div>}
    </>
  );

  const renderGrants = () => {
    const categories = [...new Set(grants.map((g) => (g.grant_data || {}).category).filter(Boolean))];
    let filtered = filter === "all" ? grants : grants.filter((g) => g.status === filter);
    if (categoryFilter !== "all") {
      filtered = filtered.filter((g) => (g.grant_data || {}).category === categoryFilter);
    }
    return (
    <>
      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
          <button onClick={() => setCategoryFilter("all")} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
            background: categoryFilter === "all" ? "#0f172a" : "#fff",
            border: `1px solid ${categoryFilter === "all" ? "#0f172a" : "#e2e8f0"}`,
            color: categoryFilter === "all" ? "#fff" : "#64748b",
          }}>Alla</button>
          {categories.map((cat) => {
            const cs = getCategoryStyle(cat);
            const active = categoryFilter === cat;
            return (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                background: active ? cs.bg : "#fff",
                border: `1px solid ${active ? cs.border : "#e2e8f0"}`,
                color: active ? cs.color : "#64748b",
              }}>{cat}</button>
            );
          })}
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => setFilter("all")} style={{
          padding: "6px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
          background: filter === "all" ? "#0f172a" : "#fff",
          border: `1px solid ${filter === "all" ? "#0f172a" : "#e2e8f0"}`,
          color: filter === "all" ? "#fff" : "#64748b",
        }}>Alla ({grants.length})</button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = statusCounts[key] || 0;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: "6px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
              background: filter === key ? cfg.bg : "#fff",
              border: `1px solid ${filter === key ? cfg.border : "#e2e8f0"}`,
              color: filter === key ? cfg.color : "#64748b",
            }}>{cfg.label} ({count})</button>
          );
        })}
      </div>

      {/* Grant card grid */}
      {loadingGrants ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 13 }}>Laddar bidrag...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            {grants.length === 0 ? "Inga sparade bidrag ännu." : "Inga bidrag matchar valt filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          {filtered.map((grant) => {
            const gd = grant.grant_data || {};
            const score = getGrantScore(grant);
            const st = STATUS_CONFIG[grant.status] || STATUS_CONFIG.new;
            const cat = gd.category;
            const catStyle = getCategoryStyle(cat);
            const days = getDaysUntil(grant.deadline);
            const draftKeys = Object.keys(grant.draft_data || {});
            const draftPct = draftKeys.length > 0 ? Math.round((draftKeys.length / 8) * 100) : 0;
            const isSelected = detailGrantId === grant.id;
            return (
              <div key={grant.id}
                onClick={() => setDetailGrantId(isSelected ? null : grant.id)}
                style={{
                  background: "#fff", border: `1px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`, borderRadius: 8,
                  padding: 16, cursor: "pointer", transition: "all 0.15s",
                  borderLeft: `4px solid ${st.color}`,
                  boxShadow: isSelected ? "0 0 0 2px rgba(59,130,246,0.15)" : "none",
                }}
                onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; } }}
                onMouseOut={(e) => { if (!isSelected) { e.currentTarget.style.boxShadow = "none"; } }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{grant.grant_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{grant.grant_agency || gd.agency || ""}</div>
                  </div>
                  <MatchScoreCircle score={score} size={40} />
                </div>
                {gd.amount && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#059669", marginBottom: 10 }}>{gd.amount}</div>
                )}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                  {cat && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`,
                    }}>{cat}</span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                    background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>{PIPELINE_ICONS[grant.status] || ""} {st.label}</span>
                  <PriorityDot priority={gd.priority} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <DeadlineBadge days={days} />
                </div>
                {draftPct > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>Ansökan</span>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>{draftPct}%</span>
                    </div>
                    <GrantProgressBar value={draftPct} color="#3b82f6" h={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail panel for selected grant */}
      {detailGrantId && (() => {
        const grant = filtered.find((g) => g.id === detailGrantId);
        if (!grant) return null;
        return (
          <div style={{ marginTop: 16, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detaljer</span>
              <button onClick={() => setDetailGrantId(null)} style={{
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4,
                padding: "4px 10px", fontSize: 11, color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>Stäng</button>
            </div>
            <GrantCard grant={grant} onUpdate={loadGrants} onDelete={handleDelete} userId={user.id} />
          </div>
        );
      })()}

      {/* Download actions */}
      {grants.length > 0 && (
        <div style={{ marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Ladda ner</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "PDF", onClick: handleDownloadAllPDF, primary: true },
              { label: "TXT", onClick: handleDownloadAllTXT },
              { label: "CSV", onClick: handleExportCSV },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.onClick} style={{
                flex: 1, minWidth: 100, padding: "8px 14px", borderRadius: 4,
                background: btn.primary ? "#3b82f6" : "#f8fafc",
                border: btn.primary ? "none" : "1px solid #e2e8f0",
                color: btn.primary ? "#fff" : "#334155",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>{btn.label}</button>
            ))}
          </div>
        </div>
      )}
    </>
    );
  };

  const renderSearches = () => (
    <>
      {searches.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>Ingen sökhistorik ännu.</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            När du gör quizet sparas dina sökningar här automatiskt.
          </div>
        </div>
      ) : (
        searches.map((s) => (
          <SearchHistoryCard key={s.id} search={s} onDelete={handleDeleteSearch} />
        ))
      )}
    </>
  );

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ display_name: editName, email: editEmail });
      setEditingProfile(false);
      showToast("Profil uppdaterad.", "success");
    } catch {
      showToast("Kunde inte spara. Försök igen.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "RADERA") return;
    setDeleting(true);
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch {
      showToast("Något gick fel. Försök igen eller kontakta oss.", "error");
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const data = await exportUserData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bidragsguiden-min-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exporterad.", "success");
    } catch {
      showToast("Kunde inte exportera data. Försök igen.", "error");
    }
  };

  const renderProfile = () => {
    const answers = quizData?.quiz_answers || {};
    const displayFields = ["company_type", "company_age", "employees", "region", "revenue", "industry", "needs", "offering_type"];
    const hasData = displayFields.some((k) => answers[k]);

    return (
      <>
        {/* Personal data section (GDPR: right to rectification) */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Personuppgifter</div>
            {!editingProfile && (
              <button onClick={() => {
                setEditName(profile?.display_name || "");
                setEditEmail(profile?.email || user?.email || "");
                setEditingProfile(true);
              }} style={{
                padding: "4px 12px", borderRadius: 4, background: "#f1f5f9",
                border: "1px solid #e2e8f0", color: "#3b82f6", fontSize: 12,
                fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>Redigera</button>
            )}
          </div>
          {editingProfile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Namn</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>E-post</label>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={handleSaveProfile} disabled={savingProfile} style={{
                  padding: "7px 16px", borderRadius: 4, background: "#3b82f6", color: "#fff",
                  border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  opacity: savingProfile ? 0.5 : 1,
                }}>{savingProfile ? "Sparar..." : "Spara"}</button>
                <button onClick={() => setEditingProfile(false)} style={{
                  padding: "7px 16px", borderRadius: 4, background: "#f1f5f9",
                  border: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>Avbryt</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: "10px 12px", borderRadius: 4, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600 }}>Namn</div>
                <div style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{profile?.display_name || "Ej angivet"}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 4, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600 }}>E-post</div>
                <div style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{profile?.email || user?.email || "Ej angivet"}</div>
              </div>
              {profile?.gdpr_consent_at && (
                <div style={{ padding: "10px 12px", borderRadius: 4, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600 }}>Samtycke</div>
                  <div style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{new Date(profile.gdpr_consent_at).toLocaleDateString("sv-SE")}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quiz profile */}
        {hasData ? (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Din företagsprofil</div>
              {quizData?.last_search_at && (
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Senast sökt: {new Date(quizData.last_search_at).toLocaleDateString("sv-SE")}</span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
              {displayFields.map((key) => {
                if (!answers[key]) return null;
                return (
                  <div key={key} style={{ padding: "10px 12px", borderRadius: 4, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600 }}>
                      {QUIZ_LABELS[key]?._title || key}
                    </div>
                    <div style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{getAnswerLabel(key, answers[key])}</div>
                  </div>
                );
              })}
              {answers.kommun && answers.kommun !== "prefer_not_to_say" && (
                <div style={{ padding: "10px 12px", borderRadius: 4, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600 }}>Kommun</div>
                  <div style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{answers.kommun}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "48px 20px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>Ingen företagsprofil sparad ännu.</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Gör quizet så sparas ditt företags uppgifter här automatiskt.</div>
          </div>
        )}
        <a href="/" style={{
          display: "inline-block", padding: "9px 20px", borderRadius: 6,
          background: "#3b82f6", color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          marginBottom: 16,
        }}>Gör nytt quiz</a>

        {/* GDPR actions */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px", marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Hantera din data</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleExportData} style={{
              padding: "8px 16px", borderRadius: 4, background: "#eff6ff",
              border: "1px solid #bfdbfe", color: "#2563eb", fontSize: 12,
              fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Ladda ner all min data (JSON)</button>
            {!confirmDelete ? (
              <button onClick={() => { setConfirmDelete(true); setDeleteConfirmText(""); }} style={{
                padding: "8px 16px", borderRadius: 4, background: "#fef2f2",
                border: "1px solid #fecaca", color: "#dc2626", fontSize: 12,
                fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>Radera mitt konto</button>
            ) : (
              <div style={{ flex: "1 1 100%", padding: "16px", borderRadius: 6, background: "#fef2f2", border: "1px solid #fecaca" }}>
                <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 4px", fontWeight: 700 }}>
                  Är du säker?
                </p>
                <p style={{ fontSize: 12, color: "#991b1b", margin: "0 0 12px", lineHeight: 1.5 }}>
                  All din data raderas permanent och kan inte återställas. Det gäller sparade bidrag, checklistor, sökhistorik och din profil.
                </p>
                <p style={{ fontSize: 12, color: "#991b1b", margin: "0 0 8px", fontWeight: 600 }}>
                  Skriv <span style={{ fontFamily: "'Space Mono', monospace", background: "#fee2e2", padding: "1px 6px", borderRadius: 3 }}>RADERA</span> för att bekräfta:
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Skriv RADERA"
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 4,
                    border: "1px solid #fecaca", fontSize: 13, boxSizing: "border-box",
                    fontFamily: "'Space Mono', monospace", marginBottom: 10,
                    background: "#fff",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setConfirmDelete(false); setDeleteConfirmText(""); }} style={{
                    padding: "7px 16px", borderRadius: 4, background: "#f1f5f9",
                    border: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>Avbryt</button>
                  <button onClick={handleDeleteAccount} disabled={deleting || deleteConfirmText !== "RADERA"} style={{
                    padding: "7px 16px", borderRadius: 4,
                    background: deleteConfirmText === "RADERA" ? "#dc2626" : "#f1f5f9",
                    border: "none",
                    color: deleteConfirmText === "RADERA" ? "#fff" : "#94a3b8",
                    fontSize: 12, fontWeight: 700, cursor: deleteConfirmText === "RADERA" ? "pointer" : "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: deleting ? 0.5 : 1,
                  }}>{deleting ? "Raderar..." : "Radera permanent"}</button>
                </div>
              </div>
            )}
          </div>
          <a href="/integritetspolicy" style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>
            Läs vår integritetspolicy
          </a>
        </div>
      </>
    );
  };

  // --- Events ---
  const EVENT_TYPE_CONFIG = {
    networking: { label: "Nätverk", color: "#2563eb", bg: "#eff6ff" },
    seminar: { label: "Seminarium", color: "#7c3aed", bg: "#f5f3ff" },
    workshop: { label: "Workshop", color: "#d97706", bg: "#fffbeb" },
    conference: { label: "Konferens", color: "#059669", bg: "#ecfdf5" },
    webinar: { label: "Webbinarium", color: "#0891b2", bg: "#ecfeff" },
    pitch: { label: "Pitch", color: "#dc2626", bg: "#fef2f2" },
  };

  const fetchEvents = async () => {
    if (!user || eventsLoading) return;
    setEventsLoading(true);
    try {
      const answers = quizData?.quiz_answers || {};
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          region: answers.region || null,
          industry: answers.industry || null,
          needs: answers.needs || null,
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      if (data.events?.length > 0) {
        const saved = [];
        for (const evt of data.events) {
          const result = await saveEvent({ userId: user.id, event: evt });
          if (result) saved.push(result);
        }
        setEvents((prev) => [...prev, ...saved]);
        showToast(`${saved.length} händelser hittades.`, "success");
      } else {
        showToast("Inga händelser hittades just nu.", "info");
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      showToast("Kunde inte hämta händelser. Försök igen.", "error");
    } finally {
      setEventsLoading(false);
    }
  };

  const handleToggleEventPlan = async (eventId, current) => {
    const newVal = !current;
    await toggleEventPlan({ eventId, addedToPlan: newVal });
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, added_to_plan: newVal } : e));
    showToast(newVal ? "Tillagd i din tidslinje." : "Borttagen från tidslinjen.", "success");
  };

  const handleDeleteEvent = async (eventId) => {
    await deleteEvent(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const renderEvents = () => {
    const planned = events.filter((e) => e.added_to_plan);
    const upcoming = events.filter((e) => !e.added_to_plan);

    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            Nätverksträffar, seminarier och informationstillfällen som passar din profil.
          </div>
          <button
            onClick={fetchEvents}
            disabled={eventsLoading}
            style={{
              padding: "8px 18px", borderRadius: 6, background: "#3b82f6", color: "#fff",
              border: "none", fontSize: 12, fontWeight: 600, cursor: eventsLoading ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif", opacity: eventsLoading ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >{eventsLoading ? "Söker..." : "Hitta händelser"}</button>
        </div>

        {planned.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>I din plan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {planned.map((evt) => {
                const typeConf = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.networking;
                const daysUntil = evt.event_date ? Math.ceil((new Date(evt.event_date) - new Date()) / 86400000) : null;
                return (
                  <div key={evt.id} style={{
                    background: "#fff", border: "1px solid #d1fae5", borderLeft: "3px solid #059669",
                    borderRadius: 8, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", flex: 1 }}>{evt.title}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                        background: typeConf.bg, color: typeConf.color,
                      }}>{typeConf.label}</span>
                    </div>
                    {evt.organizer && <div style={{ fontSize: 12, color: "#3b82f6", marginBottom: 4, fontWeight: 500 }}>{evt.organizer}</div>}
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      {evt.event_date && <span>{new Date(evt.event_date).toLocaleDateString("sv-SE")}</span>}
                      {evt.location && <span>{evt.location}</span>}
                      {daysUntil !== null && daysUntil >= 0 && (
                        <span style={{ color: daysUntil <= 7 ? "#dc2626" : daysUntil <= 30 ? "#d97706" : "#64748b", fontWeight: 600 }}>
                          {daysUntil === 0 ? "Idag" : `${daysUntil} dagar`}
                        </span>
                      )}
                    </div>
                    {evt.description && <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 }}>{evt.description}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleToggleEventPlan(evt.id, evt.added_to_plan)} style={{
                        padding: "4px 10px", borderRadius: 4, background: "#ecfdf5", border: "1px solid #a7f3d0",
                        color: "#059669", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>Ta bort från plan</button>
                      {evt.url && (
                        <a href={evt.url} target="_blank" rel="noopener noreferrer" style={{
                          padding: "4px 10px", borderRadius: 4, background: "#eff6ff", border: "1px solid #bfdbfe",
                          color: "#2563eb", fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
                        }}>Läs mer</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upcoming.length > 0 ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              Rekommenderade händelser
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {upcoming.map((evt) => {
                const typeConf = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.networking;
                const daysUntil = evt.event_date ? Math.ceil((new Date(evt.event_date) - new Date()) / 86400000) : null;
                return (
                  <div key={evt.id} style={{
                    background: "#fff", border: "1px solid #e2e8f0",
                    borderRadius: 8, padding: "14px 16px",
                    transition: "border-color 0.15s",
                  }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#94a3b8"; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", flex: 1 }}>{evt.title}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                        background: typeConf.bg, color: typeConf.color,
                      }}>{typeConf.label}</span>
                    </div>
                    {evt.organizer && <div style={{ fontSize: 12, color: "#3b82f6", marginBottom: 4, fontWeight: 500 }}>{evt.organizer}</div>}
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      {evt.event_date && <span>{new Date(evt.event_date).toLocaleDateString("sv-SE")}</span>}
                      {evt.location && <span>{evt.location}</span>}
                      {daysUntil !== null && daysUntil >= 0 && (
                        <span style={{ color: daysUntil <= 7 ? "#dc2626" : daysUntil <= 30 ? "#d97706" : "#64748b", fontWeight: 600 }}>
                          {daysUntil === 0 ? "Idag" : `${daysUntil} dagar`}
                        </span>
                      )}
                    </div>
                    {evt.description && <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 }}>{evt.description}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleToggleEventPlan(evt.id, evt.added_to_plan)} style={{
                        padding: "4px 10px", borderRadius: 4, background: "#eff6ff", border: "1px solid #bfdbfe",
                        color: "#2563eb", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>Lägg till i plan</button>
                      {evt.url && (
                        <a href={evt.url} target="_blank" rel="noopener noreferrer" style={{
                          padding: "4px 10px", borderRadius: 4, background: "#f8fafc", border: "1px solid #e2e8f0",
                          color: "#334155", fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
                        }}>Läs mer</a>
                      )}
                      <button onClick={() => handleDeleteEvent(evt.id)} style={{
                        padding: "4px 10px", borderRadius: 4, background: "#fef2f2", border: "1px solid #fecaca",
                        color: "#dc2626", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}>Ta bort</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : events.length === 0 && (
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
            padding: "48px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, color: "#cbd5e1", marginBottom: 8 }}>{"\u2691"}</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>Inga händelser ännu</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
              Klicka "Hitta händelser" så söker AI:n igenom Vinnova, Almi, Tillväxtverket och fler efter evenemang som passar din profil.
            </div>
          </div>
        )}
      </>
    );
  };

  const renderResources = () => (
    <>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        Användbara länkar till myndigheter, rådgivning och finansieringskällor för svenska företag.
      </div>
      {RESOURCES.map((group) => (
        <div key={group.category} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>{group.category}</div>
          </div>
          {group.links.map((link) => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{
              display: "block", padding: "12px 16px", textDecoration: "none",
              borderBottom: "1px solid #f8fafc", transition: "background 0.1s",
            }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>{link.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{link.desc}</div>
                </div>
                <span style={{ color: "#cbd5e1", fontSize: 13 }}>&rarr;</span>
              </div>
            </a>
          ))}
        </div>
      ))}
    </>
  );

  // --- Pipeline (kanban) view ---
  const PIPELINE_COLS = [
    { key: "new", label: "Hittade", color: "#64748b" },
    { key: "investigating", label: "Undersöker", color: "#6366f1" },
    { key: "applying", label: "Skriver ansökan", color: "#f59e0b" },
    { key: "applied", label: "Inskickad", color: "#10b981" },
    { key: "granted", label: "Beviljad", color: "#22c55e" },
    { key: "rejected", label: "Nekad", color: "#ef4444" },
  ];

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const renderPipeline = () => {
    const cols = PIPELINE_COLS.filter(
      (c) => grants.some((g) => g.status === c.key) || ["new", "investigating", "applying", "applied"].includes(c.key)
    );
    return (
      <>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
          Dra dina bidrag genom processen -- från upptäckt till ansökan.
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols.length}, minmax(160px, 1fr))`,
          gap: 10, overflowX: "auto", paddingBottom: 8,
        }}>
          {cols.map((col) => {
            const colGrants = grants.filter((g) => g.status === col.key);
            return (
              <div key={col.key} style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: 10, minHeight: 300,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 10, paddingBottom: 8,
                  borderBottom: `2px solid ${col.color}`,
                }}>
                  <span style={{ fontSize: 14, color: col.color }}>{PIPELINE_ICONS[col.key] || ""}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{col.label}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 11, fontWeight: 700,
                    background: `${col.color}15`, color: col.color,
                    padding: "1px 8px", borderRadius: 10,
                  }}>{colGrants.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {colGrants.map((g) => {
                    const days = getDaysUntil(g.deadline);
                    const grantData = g.grant_data || {};
                    const score = getGrantScore(g);
                    const cat = grantData.category;
                    const catStyle = getCategoryStyle(cat);
                    const draftKeys = Object.keys(g.draft_data || {});
                    const draftPct = draftKeys.length > 0 ? Math.round((draftKeys.length / 8) * 100) : 0;
                    return (
                      <div key={g.id} onClick={() => { setActiveSection("grants"); setDetailGrantId(g.id); }}
                        style={{
                          background: "#f8fafc", border: "1px solid #e2e8f0",
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#f0f4ff"; e.currentTarget.style.borderColor = `${col.color}55`; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{g.grant_name}</div>
                          <MatchScoreCircle score={score} size={28} />
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{g.grant_agency || grantData.agency || ""}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {cat && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                              background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`,
                            }}>{cat}</span>
                          )}
                          <DeadlineBadge days={days} />
                        </div>
                        {draftPct > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <GrantProgressBar value={draftPct} color={col.color} h={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {colGrants.length === 0 && (
                    <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 20 }}>Inga bidrag</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {grants.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "48px 20px", textAlign: "center", marginTop: 16 }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>Inga sparade bidrag ännu.</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Gör quizet för att hitta bidrag och börja bygga din pipeline.</div>
            <a href="/" style={{
              display: "inline-block", padding: "10px 24px", borderRadius: 6,
              background: "#3b82f6", color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }}>Gör nytt quiz</a>
          </div>
        )}
      </>
    );
  };

  // --- Timeline (deadline) view ---
  const renderTimeline = () => {
    const grantItems = grants
      .filter((g) => g.status !== "archived" && g.status !== "rejected")
      .map((g) => ({ type: "grant", date: g.deadline, item: g }));
    const eventItems = events
      .filter((e) => e.added_to_plan)
      .map((e) => ({ type: "event", date: e.event_date, item: e }));
    const sorted = [...grantItems, ...eventItems].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    return (
      <>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
          Alla dina bidrag och planerade händelser sorterade efter datum.
        </div>
        {sorted.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>Inga aktiva bidrag att visa.</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Spara bidrag från quizet för att se dem här.</div>
          </div>
        ) : (
          <>
            {/* Table header */}
            {!isMobile && (
              <div style={{
                display: "grid", gridTemplateColumns: "100px 40px 1fr 140px 110px 90px",
                gap: 8, padding: "8px 16px", marginBottom: 6,
                fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                <div>Deadline</div>
                <div>Match</div>
                <div>Bidrag</div>
                <div>Belopp</div>
                <div>Status</div>
                <div>Tid kvar</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sorted.map((entry) => {
                if (entry.type === "event") {
                  const evt = entry.item;
                  const days = evt.event_date ? Math.ceil((new Date(evt.event_date) - new Date()) / 86400000) : null;
                  const typeConf = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.networking;
                  const urgent = days !== null && days >= 0 && days <= 14;
                  return (
                    <div key={`evt-${evt.id}`} style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "100px 40px 1fr 140px 110px 90px",
                      gap: 8, alignItems: "center",
                      background: "#fefce8", border: `1px solid ${urgent ? "#fcd34d" : "#fef08a"}`,
                      borderLeft: `4px solid ${typeConf.color}`,
                      borderRadius: 10, padding: "14px 16px",
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                      onClick={() => setActiveSection("events")}
                      onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                        {evt.event_date ? new Date(evt.event_date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "TBD"}
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8,
                        background: typeConf.bg, color: typeConf.color,
                      }}>{typeConf.label.slice(0, 3)}</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{evt.title}</span>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{evt.organizer || ""} {evt.location ? `- ${evt.location}` : ""}</div>
                      </div>
                      {!isMobile && <div style={{ fontSize: 12, color: "#94a3b8" }}>-</div>}
                      {!isMobile && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5,
                          background: "#fefce8", color: "#a16207", border: "1px solid #fde68a",
                          justifySelf: "start",
                        }}>Händelse</span>
                      )}
                      <div style={{ justifySelf: "end" }}>
                        <DeadlineBadge days={days} />
                      </div>
                    </div>
                  );
                }
                const g = entry.item;
                const days = getDaysUntil(g.deadline);
                const st = STATUS_CONFIG[g.status] || STATUS_CONFIG.new;
                const grantData = g.grant_data || {};
                const score = getGrantScore(g);
                const urgent = days !== null && days >= 0 && days <= 14;
                const soon = days !== null && days >= 0 && days <= 30;
                return (
                  <div key={g.id} style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "100px 40px 1fr 140px 110px 90px",
                    gap: 8, alignItems: "center",
                    background: "#fff", border: `1px solid ${urgent ? "#fcd34d" : "#e2e8f0"}`,
                    borderLeft: `4px solid ${urgent ? "#ef4444" : soon ? "#f59e0b" : st.color}`,
                    borderRadius: 10, padding: "14px 16px",
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                    onClick={() => { setActiveSection("grants"); setDetailGrantId(g.id); }}
                    onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                      {g.deadline ? new Date(g.deadline).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "Löpande"}
                    </div>
                    <MatchScoreCircle score={score} size={30} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <PriorityDot priority={grantData.priority} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{g.grant_name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{g.grant_agency || grantData.agency || ""}</div>
                    </div>
                    {!isMobile && (
                      <div style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>{grantData.amount || ""}</div>
                    )}
                    {!isMobile && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        display: "inline-flex", alignItems: "center", gap: 3, justifySelf: "start",
                      }}>{PIPELINE_ICONS[g.status] || ""} {st.label}</span>
                    )}
                    <div style={{ justifySelf: "end" }}>
                      <DeadlineBadge days={days} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  };

  // --- AI Application Drafter ---
  const AI_SECTIONS = [
    { id: "summary", label: "Sammanfattning" },
    { id: "problem", label: "Problembeskrivning" },
    { id: "solution", label: "Lösningsbeskrivning" },
    { id: "market", label: "Marknad och målgrupp" },
    { id: "team", label: "Team och kompetens" },
    { id: "budget", label: "Budget och finansiering" },
    { id: "impact", label: "Förväntad effekt" },
    { id: "timeline", label: "Tidplan" },
  ];

  const generateDraft = async () => {
    const grant = grants.find((g) => g.id === draftGrant);
    if (!grant) return;
    setDraftGenerating(true);
    setDraftText("");
    const grantData = grant.grant_data || {};
    const companyProfile = quizData?.quiz_answers || {};
    const sectionLabel = AI_SECTIONS.find((s) => s.id === draftSection)?.label || draftSection;

    const prompt = `Du är en expert på att skriva ansökningar för svenska företag. Skriv ett utkast för sektionen "${sectionLabel}" i en ansökan till ${grant.grant_name} (${grant.grant_agency || grantData.agency || "okänd myndighet"}).

BIDRAGET:
- Namn: ${grant.grant_name}
- Myndighet: ${grant.grant_agency || grantData.agency || "ej angivet"}
- Beskrivning: ${grantData.description || "ej angivet"}
- Belopp: ${grantData.amount || "ej angivet"}
- Krav: ${grantData.eligibility_summary || "ej angivet"}
- Dokument: ${grantData.required_docs || "ej angivet"}

FÖRETAGET:
- Bolagsform: ${companyProfile.company_type || "ej angivet"}
- Företagets ålder: ${companyProfile.company_age || "ej angivet"}
- Anställda: ${companyProfile.employees || "ej angivet"}
- Region: ${companyProfile.region || "ej angivet"}
- Omsättning: ${companyProfile.revenue || "ej angivet"}
- Bransch: ${Array.isArray(companyProfile.industry) ? companyProfile.industry.join(", ") : companyProfile.industry || "ej angivet"}
- Behov: ${Array.isArray(companyProfile.needs) ? companyProfile.needs.join(", ") : companyProfile.needs || "ej angivet"}

Skriv utkastet på professionell svenska, anpassat för ${grant.grant_name}. Var konkret, specifik och övertygande. Använd INGA emojis. Svaret ska vara ren text (inte JSON), 200-400 ord.`;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          sessionId: undefined,
          userId: user?.id || undefined,
          quickQuestion: true,
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      const text = data.content
        .map((item) => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("\n");
      setDraftText(text);
      // Auto-save to database
      await saveDraftSection({ grantId: grant.id, section: draftSection, content: text });
      showToast("Utkast genererat och sparat.", "success");
    } catch {
      showToast("Kunde inte generera utkast. Försök igen.", "error");
    } finally {
      setDraftGenerating(false);
    }
  };

  const renderAIDraft = () => {
    const selectedGrant = grants.find((g) => g.id === draftGrant);
    return (
      <>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
          Välj ett bidrag och låt AI:n skriva utkast för din ansökan -- sektion för sektion.
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "260px 1fr",
          gap: 16, minHeight: 400,
        }}>
          {/* Left: Grant selector */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Välj bidrag att skriva för
            </div>
            {grants.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8", padding: 16, textAlign: "center" }}>
                Inga sparade bidrag. Gör quizet först.
              </div>
            ) : (
              grants.map((g) => {
                const active = draftGrant === g.id;
                const draftKeys = Object.keys(g.draft_data || {});
                const draftPct = draftKeys.length > 0 ? Math.round((draftKeys.length / 8) * 100) : 0;
                return (
                  <div key={g.id}
                    onClick={() => {
                      setDraftGrant(g.id);
                      // Load existing draft text for selected section
                      const existing = (g.draft_data || {})[draftSection];
                      setDraftText(existing || "");
                    }}
                    style={{
                      padding: "10px 12px", borderRadius: 6, marginBottom: 4,
                      background: active ? "#eff6ff" : "transparent",
                      border: `1px solid ${active ? "#bfdbfe" : "transparent"}`,
                      cursor: "pointer", transition: "background 0.1s",
                    }}
                    onMouseOver={(e) => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseOut={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{g.grant_name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{g.grant_agency || ""}</div>
                    <div style={{ marginTop: 8 }}>
                      <GrantProgressBar value={draftPct} color="#3b82f6" h={3} />
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{draftPct}% färdigskrivet</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Draft area */}
          {!selectedGrant ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 8,
              color: "#94a3b8", gap: 8,
            }}>
              <span style={{ fontSize: 36, color: "#cbd5e1" }}>{"\u270E"}</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>AI Ansökansassistent</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Välj ett sparat bidrag till vänster för att börja skriva</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column" }}>
              {/* Grant header */}
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>{selectedGrant.grant_name}</h3>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>AI genererar ansökningstext baserat på din företagsprofil och bidragets krav</div>
              </div>

              {/* Section tabs */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                {AI_SECTIONS.map((s) => {
                  const active = draftSection === s.id;
                  const hasDraft = !!(selectedGrant.draft_data || {})[s.id];
                  return (
                    <button key={s.id}
                      onClick={() => {
                        setDraftSection(s.id);
                        const existing = (selectedGrant.draft_data || {})[s.id];
                        setDraftText(existing || "");
                      }}
                      style={{
                        background: active ? "#eff6ff" : hasDraft ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${active ? "#bfdbfe" : hasDraft ? "#bbf7d0" : "#e2e8f0"}`,
                        color: active ? "#2563eb" : hasDraft ? "#059669" : "#64748b",
                        borderRadius: 4, padding: "5px 10px", fontSize: 11,
                        fontWeight: active ? 600 : 400, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >{s.label}{hasDraft ? " (klar)" : ""}</button>
                  );
                })}
              </div>

              {/* Generate button */}
              <button onClick={generateDraft} disabled={draftGenerating}
                style={{
                  background: draftGenerating ? "#f1f5f9" : "linear-gradient(135deg, #f59e0b, #ef4444)",
                  border: "none", color: draftGenerating ? "#94a3b8" : "#fff",
                  borderRadius: 6, padding: "10px 20px", fontSize: 13,
                  fontWeight: 600, cursor: draftGenerating ? "wait" : "pointer",
                  fontFamily: "'DM Sans', sans-serif", marginBottom: 12,
                  transition: "all 0.2s",
                }}
              >
                {draftGenerating ? "Genererar..." : `Generera ${AI_SECTIONS.find((s) => s.id === draftSection)?.label || ""}`}
              </button>

              {/* Draft text area */}
              <div style={{
                flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 6, padding: 16, fontSize: 13, lineHeight: 1.7,
                color: "#334155", whiteSpace: "pre-wrap", overflow: "auto",
                minHeight: 300, fontFamily: "'DM Sans', sans-serif",
              }}>
                {draftText || (
                  <span style={{ color: "#94a3b8" }}>
                    Klicka &quot;Generera&quot; för att skapa ett AI-utkast för sektionen &quot;{AI_SECTIONS.find((s) => s.id === draftSection)?.label}&quot;.
                    AI:n använder din företagsprofil och bidragets krav för att skapa ett anpassat utkast.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const sectionTitles = { overview: "Översikt", grants: "Mina bidrag", pipeline: "Pipeline", timeline: "Tidslinje", "ai-draft": "AI Ansökan", searches: "Sökhistorik", profile: "Företagsprofil", resources: "Resurser" };

  return (
    <>
      <Head>
        <title>{sectionTitles[activeSection]} -- Bidragsguiden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#0f172a" }}>
        {/* Sidebar - desktop */}
        {!isMobile && sidebarContent}

        {/* Sidebar - mobile overlay */}
        {isMobile && sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99 }} />
            {sidebarContent}
          </>
        )}

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            background: "#1e293b", padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "sticky", top: 0, zIndex: 50,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setSidebarOpen(true)} style={{
                background: "none", border: "none", color: "#f1f5f9", fontSize: 20, cursor: "pointer", padding: "0 4px",
              }}>{"\u2630"}</button>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Bidragsguiden</span>
            </div>
            <a href="/" style={{
              padding: "6px 12px", borderRadius: 4, background: "#3b82f6", color: "#fff",
              fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
            }}>Gör nytt quiz</a>
          </div>
        )}

        {/* Content area */}
        <div style={{ marginLeft: isMobile ? 0 : SIDEBAR_W, minHeight: "100vh" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "20px 16px" : "28px 32px" }}>
            {/* Page header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" }}>{sectionTitles[activeSection]}</h1>
            </div>

            {/* Section content */}
            {activeSection === "overview" && renderOverview()}
            {activeSection === "grants" && renderGrants()}
            {activeSection === "pipeline" && renderPipeline()}
            {activeSection === "timeline" && renderTimeline()}
            {activeSection === "events" && renderEvents()}
            {activeSection === "ai-draft" && renderAIDraft()}
            {activeSection === "searches" && renderSearches()}
            {activeSection === "profile" && renderProfile()}
            {activeSection === "resources" && renderResources()}

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "#94a3b8" }}>
              <a href="/integritetspolicy" style={{ color: "#94a3b8", textDecoration: "none" }}>Integritetspolicy</a>
              <a href="/anvandarvillkor" style={{ color: "#94a3b8", textDecoration: "none" }}>Användarvillkor</a>
              <a href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Bidragsguiden</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
