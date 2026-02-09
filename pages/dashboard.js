import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../lib/auth";
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
  region: { _title: "Län", stockholm: "Stockholm", vastra_gotaland: "Västra Götaland", skane: "Skåne", ostergotland: "Östergötland", uppsala: "Uppsala", jonkoping: "Jönköping", halland: "Halland", orebro: "Örebro", sodermanland: "Södermanland", dalarna: "Dalarna", gavleborg: "Gävleborg", varmland: "Värmland", vastmanland: "Västmanland", norrbotten: "Norrbotten", vasterbotten: "Västerbotten", vasternorrland: "Västernorrland", jamtland: "Jämtland", kalmar: "Kalmar", kronoberg: "Kronoberg", blekinge: "Blekinge", gotland: "Gotland" },
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
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [grants, setGrants] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [searches, setSearches] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const loadGrants = useCallback(async () => {
    if (!user) return;
    setLoadingGrants(true);
    const [grantsData, quizProfile, userSearches] = await Promise.all([
      getSavedGrants(user.id),
      getQuizAnswers(user.id),
      getUserSearches(user.id),
    ]);
    setGrants(grantsData);
    setQuizData(quizProfile);
    setSearches(userSearches);
    setLoadingGrants(false);
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
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
        Laddar...
      </div>
    );
  }

  const filteredGrants = filter === "all" ? grants : grants.filter((g) => g.status === filter);
  const upcomingDeadlines = grants
    .filter((g) => g.deadline && new Date(g.deadline) >= new Date() && g.status !== "archived" && g.status !== "rejected")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

  const statusCounts = {};
  grants.forEach((g) => { statusCounts[g.status] = (statusCounts[g.status] || 0) + 1; });

  // --- Sidebar ---
  const navItems = [
    { key: "overview", label: "Översikt" },
    { key: "grants", label: "Mina bidrag", count: grants.length },
    { key: "searches", label: "Sökhistorik", count: searches.length },
    { key: "profile", label: "Företagsprofil" },
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
              <span>{item.label}</span>
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

      {/* User + logout */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{profile?.display_name || profile?.email || ""}</div>
        <button onClick={signOut} style={{
          background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif",
        }}>Logga ut</button>
      </div>
    </div>
  );

  // --- Sections ---

  const renderOverview = () => (
    <>
      {/* Stats row */}
      <div style={{
        display: "flex", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", marginBottom: 20,
      }}>
        {[
          { label: "Totalt", value: grants.length, color: "#0f172a" },
          { label: "Nya", value: statusCounts.new || 0, color: "#2563eb" },
          { label: "Undersöker", value: statusCounts.investigating || 0, color: "#d97706" },
          { label: "Ansökt", value: statusCounts.applied || 0, color: "#7c3aed" },
          { label: "Beviljade", value: statusCounts.granted || 0, color: "#059669" },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: "16px 12px", textAlign: "center",
            borderRight: i < 4 ? "1px solid #f1f5f9" : "none",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'DM Sans', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Kommande deadlines</div>
          {upcomingDeadlines.map((g) => {
            const days = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid #f8fafc" }}>
                <span style={{ color: "#334155" }}>{g.grant_name}</span>
                <span style={{ color: days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "#64748b", fontWeight: 600, fontSize: 12 }}>
                  {new Date(g.deadline).toLocaleDateString("sv-SE")} ({days}d)
                </span>
              </div>
            );
          })}
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

  const renderGrants = () => (
    <>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
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

      {/* Grant list */}
      {loadingGrants ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 13 }}>Laddar bidrag...</div>
      ) : filteredGrants.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            {grants.length === 0 ? "Inga sparade bidrag ännu." : "Inga bidrag med vald status."}
          </div>
        </div>
      ) : (
        filteredGrants.map((grant) => (
          <GrantCard key={grant.id} grant={grant} onUpdate={loadGrants} onDelete={handleDelete} userId={user.id} />
        ))
      )}

      {/* Download actions */}
      {grants.length > 0 && (
        <div style={{ marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "14px 16px" }}>
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

  const renderProfile = () => {
    const answers = quizData?.quiz_answers || {};
    const displayFields = ["company_type", "company_age", "employees", "region", "revenue", "industry", "needs", "offering_type"];
    const hasData = displayFields.some((k) => answers[k]);

    return (
      <>
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
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>Ingen företagsprofil sparad ännu.</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Gör quizet så sparas ditt företags uppgifter här automatiskt.</div>
          </div>
        )}
        <a href="/" style={{
          display: "inline-block", padding: "9px 20px", borderRadius: 6,
          background: "#3b82f6", color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
        }}>Gör nytt quiz</a>
      </>
    );
  };

  const sectionTitles = { overview: "Översikt", grants: "Mina bidrag", searches: "Sökhistorik", profile: "Företagsprofil" };

  return (
    <>
      <Head>
        <title>{sectionTitles[activeSection]} -- Bidragsguiden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "20px 16px" : "28px 32px" }}>
            {/* Page header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" }}>{sectionTitles[activeSection]}</h1>
            </div>

            {/* Section content */}
            {activeSection === "overview" && renderOverview()}
            {activeSection === "grants" && renderGrants()}
            {activeSection === "searches" && renderSearches()}
            {activeSection === "profile" && renderProfile()}

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "#94a3b8" }}>
              <a href="/integritetspolicy" style={{ color: "#94a3b8", textDecoration: "none" }}>Integritetspolicy</a>
              <a href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Bidragsguiden</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
