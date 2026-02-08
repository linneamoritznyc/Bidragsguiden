import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../lib/auth";
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
  new: { label: "Ny", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
  investigating: { label: "Undersöker", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)" },
  applying: { label: "Förbereder ansökan", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)" },
  applied: { label: "Ansökt", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
  granted: { label: "Beviljad", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  rejected: { label: "Nekad", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  archived: { label: "Arkiverad", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
};

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
    const item = await addChecklistItem({
      savedGrantId: grant.id,
      userId,
      label: newItem.trim(),
    });
    if (item) {
      setChecklist((prev) => [...prev, item]);
      setNewItem("");
    }
  };

  const handleDeleteItem = async (itemId) => {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    await deleteChecklistItem(itemId);
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 14, padding: "20px",
      marginBottom: 12,
      borderLeft: `3px solid ${st.color}`,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer" }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", gap: 8, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
              {grant.grant_name}
            </h3>
            <p style={{ fontSize: 12, color: "#38bdf8", margin: 0, fontWeight: 500 }}>
              {grant.grant_agency}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: st.color,
              background: st.bg, padding: "3px 10px", borderRadius: 12,
            }}>{st.label}</span>
            {doneCount > 0 && (
              <span style={{
                fontSize: 10, color: "#64748b",
              }}>{doneCount}/{checklist.length}</span>
            )}
            <span style={{ fontSize: 14, color: "#475569" }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Quick info row */}
        <div style={{
          display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#64748b",
          flexWrap: "wrap",
        }}>
          {grantData.amount && <span>Belopp: {grantData.amount}</span>}
          {deadline && (
            <span style={{ color: new Date(deadline) < new Date() ? "#ef4444" : "#fbbf24" }}>
              Deadline: {new Date(deadline).toLocaleDateString("sv-SE")}
            </span>
          )}
          {grantData.category && <span>{grantData.category}</span>}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          {/* Description */}
          {grantData.description && (
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
              {grantData.description}
            </p>
          )}

          {/* Eligibility */}
          {grantData.eligibility_summary && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 12,
              background: "rgba(56, 189, 248, 0.04)",
              border: "1px solid rgba(56, 189, 248, 0.1)",
            }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                Vem kan söka
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                {grantData.eligibility_summary}
              </div>
            </div>
          )}

          {/* Link */}
          {grantData.url && (
            <a href={grantData.url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", fontSize: 13, color: "#38bdf8",
              textDecoration: "none", fontWeight: 500, marginBottom: 16,
            }}>Läs mer på {grant.grant_agency} →</a>
          )}

          {/* Status selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, border: "none",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    background: grant.status === key ? cfg.bg : "rgba(255,255,255,0.04)",
                    color: grant.status === key ? cfg.color : "#64748b",
                    transition: "all 0.2s",
                  }}
                >{cfg.label}</button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Deadline</div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)", color: "#e2e8f0",
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
              Checklista ({doneCount}/{checklist.length})
            </div>
            {checklist.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggle(item)}
                  style={{ marginTop: 3, cursor: "pointer", accentColor: "#10b981" }}
                />
                <span style={{
                  flex: 1, fontSize: 13, color: item.done ? "#475569" : "#cbd5e1",
                  textDecoration: item.done ? "line-through" : "none",
                  lineHeight: 1.4,
                }}>{item.label}</span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  style={{
                    background: "none", border: "none", color: "#475569",
                    fontSize: 12, cursor: "pointer", padding: "2px 6px",
                  }}
                >x</button>
              </div>
            ))}
            {/* Add new item */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
                placeholder="Lägg till punkt..."
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)", color: "#e2e8f0",
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <button
                onClick={handleAddItem}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >+</button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Egna anteckningar</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Skriv anteckningar om detta bidrag..."
              style={{
                width: "100%", minHeight: 70, padding: "10px 12px",
                borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)", color: "#cbd5e1",
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                resize: "vertical", lineHeight: 1.4,
              }}
            />
          </div>

          {/* Delete */}
          <button
            onClick={() => { if (confirm("Vill du ta bort detta bidrag?")) { onDelete(grant.id); } }}
            style={{
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              borderRadius: 8, padding: "8px 14px",
              color: "#ef4444", fontSize: 12, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >Ta bort bidrag</button>
        </div>
      )}
    </div>
  );
}

// Readable labels for quiz answers
const QUIZ_LABELS = {
  company_type: {
    _title: "Bolagsform",
    enskild_firma: "Enskild firma",
    handelsbolag: "Handelsbolag (HB)",
    kommanditbolag: "Kommanditbolag (KB)",
    aktiebolag: "Aktiebolag (AB)",
    ekonomisk_forening: "Ekonomisk förening",
    ideell_forening: "Ideell förening",
    planning: "Planerar att starta",
  },
  company_age: {
    _title: "Företagets ålder",
    not_started: "Inte startat än",
    less_1y: "Mindre än 1 år",
    "1_3y": "1-3 år",
    "3_5y": "3-5 år",
    over_5y: "Mer än 5 år",
  },
  employees: {
    _title: "Anställda",
    solo: "0 (solo)",
    micro: "1-9",
    small: "10-49",
    medium: "50-249",
    large: "250+",
  },
  region: {
    _title: "Län",
    stockholm: "Stockholm", vastra_gotaland: "Västra Götaland",
    skane: "Skåne", ostergotland: "Östergötland", uppsala: "Uppsala",
    jonkoping: "Jönköping", halland: "Halland", orebro: "Örebro",
    sodermanland: "Södermanland", dalarna: "Dalarna", gavleborg: "Gävleborg",
    varmland: "Värmland", vastmanland: "Västmanland", norrbotten: "Norrbotten",
    vasterbotten: "Västerbotten", vasternorrland: "Västernorrland",
    jamtland: "Jämtland", kalmar: "Kalmar", kronoberg: "Kronoberg",
    blekinge: "Blekinge", gotland: "Gotland",
  },
  revenue: {
    _title: "Omsättning",
    zero: "Ingen omsättning",
    under_300k: "Under 300 000 kr",
    "300k_600k": "300-600 000 kr",
    "600k_3m": "600 000-3 mkr",
    "3m_10m": "3-10 mkr",
    "10m_50m": "10-50 mkr",
    over_50m: "Över 50 mkr",
    prefer_not_to_say: "Ej angivet",
    under_500k: "Under 500 000 kr",
    "500k_3m": "500 000-3 mkr",
  },
  industry: {
    _title: "Bransch",
    tech: "Tech/IT", ecommerce: "Handel", manufacturing: "Tillverkning",
    construction: "Bygg", cleaning_facility: "Städ/Fastighet",
    hospitality: "Restaurang", health: "Hälsa/Vård",
    beauty_personal: "Skönhet", transport: "Transport",
    automotive: "Fordon", consulting: "Konsult", creative: "Kreativ/Kultur",
    agriculture: "Jordbruk", energy: "Energi", education: "Utbildning",
    other: "Annat",
  },
  offering_type: {
    _title: "Erbjudande",
    physical_products: "Produkter",
    services: "Tjänster",
    both: "Både och",
    unsure: "Osäkert",
  },
  needs: {
    _title: "Behov",
    investment: "Investering", product_dev: "Produktutveckling",
    export: "Export", digitalization: "Digitalisering",
    sustainability: "Hållbarhet", hiring_skills: "Personal",
    marketing_sales: "Marknadsföring", startup_support: "Starta eget",
    rnd: "Forskning", premises: "Lokaler", ip_patents: "Patent",
    finance_liquidity: "Ekonomi", pivot: "Omställning", unsure: "Osäkert",
  },
};

function getAnswerLabel(key, value) {
  const map = QUIZ_LABELS[key];
  if (!map) return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => map[v] || v).join(", ");
  }
  return map[value] || String(value);
}

function CompanyProfile({ quizData }) {
  if (!quizData?.quiz_answers) return null;
  const answers = quizData.quiz_answers;
  const displayFields = ["company_type", "company_age", "employees", "region", "revenue", "industry", "needs", "offering_type"];
  const hasData = displayFields.some((k) => answers[k]);
  if (!hasData) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "20px", marginBottom: 24,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14,
      }}>
        <h3 style={{
          fontSize: 12, fontWeight: 600, color: "#38bdf8",
          textTransform: "uppercase", letterSpacing: "1px",
          margin: 0, fontFamily: "'Space Mono', monospace",
        }}>Din företagsprofil</h3>
        {quizData.last_search_at && (
          <span style={{ fontSize: 11, color: "#475569" }}>
            Senast sökt: {new Date(quizData.last_search_at).toLocaleDateString("sv-SE")}
          </span>
        )}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 10,
      }}>
        {displayFields.map((key) => {
          if (!answers[key]) return null;
          const label = QUIZ_LABELS[key]?._title || key;
          const value = getAnswerLabel(key, answers[key]);
          return (
            <div key={key} style={{
              padding: "10px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{
                fontSize: 10, color: "#64748b", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 3,
              }}>{label}</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{value}</div>
            </div>
          );
        })}
        {answers.kommun && answers.kommun !== "prefer_not_to_say" && (
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{
              fontSize: 10, color: "#64748b", textTransform: "uppercase",
              letterSpacing: "0.5px", marginBottom: 3,
            }}>Kommun</div>
            <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{answers.kommun}</div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <a href="/" style={{
          fontSize: 12, color: "#38bdf8", textDecoration: "none", fontWeight: 500,
        }}>Gör en ny sökning med uppdaterad info →</a>
      </div>
    </div>
  );
}

function SearchHistoryCard({ search, onDelete, onReuse }) {
  const [expanded, setExpanded] = useState(false);
  const answers = search.answers || {};
  const result = search.result || {};
  const grantCount = result.benefits?.length || 0;
  const date = new Date(search.created_at).toLocaleDateString("sv-SE", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10, padding: "14px 16px", marginBottom: 8,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
            {getAnswerLabel("industry", answers.industry) || "Sökning"}{" "}
            {answers.region && <span style={{ color: "#64748b", fontWeight: 400 }}>i {getAnswerLabel("region", answers.region)}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {date} -- {grantCount} bidrag{search.refine_count > 0 ? `, förfinad ${search.refine_count}x` : ""}
          </div>
        </div>
        <span style={{ fontSize: 14, color: "#475569" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
          {/* Quick summary */}
          {result.summary && (
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
              {result.summary}
            </p>
          )}

          {/* Top grants from this search */}
          {result.benefits && result.benefits.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                Bidrag från denna sökning
              </div>
              {result.benefits.slice(0, 5).map((b, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)",
                  fontSize: 12,
                }}>
                  <span style={{ color: "#cbd5e1" }}>{b.name}</span>
                  <span style={{
                    fontSize: 10, color: b.priority === "high" ? "#10b981" : b.priority === "medium" ? "#60a5fa" : "#64748b",
                  }}>{b.priority === "high" ? "Hög" : b.priority === "medium" ? "Medel" : "Låg"}</span>
                </div>
              ))}
              {result.benefits.length > 5 && (
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                  +{result.benefits.length - 5} till...
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={`/?prefill=history&searchId=${search.id}`}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                color: "#38bdf8", fontSize: 11, fontWeight: 600,
                textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
              }}
            >Sök igen med samma svar</a>
            <button
              onClick={() => { if (confirm("Ta bort denna sökning?")) onDelete(search.id); }}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                color: "#ef4444", fontSize: 11, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >Ta bort</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [grants, setGrants] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [searches, setSearches] = useState([]);
  const [showSearches, setShowSearches] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
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

  useEffect(() => {
    if (user) loadGrants();
  }, [user, loadGrants]);

  const handleDelete = async (grantId) => {
    await deleteSavedGrant(grantId);
    setGrants((prev) => prev.filter((g) => g.id !== grantId));
  };

  const handleDeleteSearch = async (searchId) => {
    await deleteUserSearch(searchId);
    setSearches((prev) => prev.filter((s) => s.id !== searchId));
  };

  const handleExportCSV = () => {
    if (grants.length === 0) return;
    const headers = ["Bidrag", "Myndighet", "Status", "Belopp", "Deadline", "Kategori", "Checklista klar", "Anteckningar"];
    const rows = grants.map((g) => {
      const d = g.grant_data || {};
      const items = g.bg_checklist_items || [];
      const done = items.filter((c) => c.done).length;
      return [
        g.grant_name,
        g.grant_agency || "",
        STATUS_CONFIG[g.status]?.label || g.status,
        d.amount || "",
        g.deadline || "",
        d.category || "",
        `${done}/${items.length}`,
        (g.notes || "").replace(/\n/g, " "),
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const bom = "\uFEFF"; // UTF-8 BOM for Swedish characters in Excel/Sheets
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidragsguiden-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    if (!user) return;
    const data = await exportUserData(user.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidragsguiden-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !user) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#64748b", fontFamily: "'DM Sans', sans-serif",
      }}>
        Laddar...
      </div>
    );
  }

  const filteredGrants = filter === "all"
    ? grants
    : grants.filter((g) => g.status === filter);

  const upcomingDeadlines = grants
    .filter((g) => g.deadline && new Date(g.deadline) >= new Date() && g.status !== "archived" && g.status !== "rejected")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  return (
    <>
      <Head>
        <title>Dashboard — Bidragsguiden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#e2e8f0",
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto", padding: "24px 16px",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #38bdf8, #10b981)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: "#0a1628",
                fontFamily: "'Space Mono', monospace",
              }}>B</div>
              <h1 style={{
                fontSize: 18, fontWeight: 700, margin: 0,
                fontFamily: "'Space Mono', monospace",
                color: "#e2e8f0",
              }}>Dashboard</h1>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {profile?.display_name || profile?.email || ""}
              </span>
              <a href="/" style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                color: "#38bdf8", fontSize: 12, fontWeight: 500,
                textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
              }}>Nytt quiz</a>
              <button
                onClick={signOut}
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#64748b", fontSize: 12, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Logga ut</button>
            </div>
          </div>

          {/* Stats overview */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10, marginBottom: 24,
          }}>
            {[
              { label: "Totalt", value: grants.length, color: "#e2e8f0" },
              { label: "Nya", value: grants.filter((g) => g.status === "new").length, color: "#38bdf8" },
              { label: "Undersöker", value: grants.filter((g) => g.status === "investigating").length, color: "#fbbf24" },
              { label: "Ansökt", value: grants.filter((g) => g.status === "applied").length, color: "#60a5fa" },
              { label: "Beviljade", value: grants.filter((g) => g.status === "granted").length, color: "#10b981" },
            ].map((s) => (
              <div key={s.label} style={{
                padding: "14px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Company profile */}
          <CompanyProfile quizData={quizData} />

          {/* Search history */}
          {searches.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={() => setShowSearches(!showSearches)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  background: "rgba(167, 139, 250, 0.04)",
                  border: "1px solid rgba(167, 139, 250, 0.15)",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: 600, color: "#a78bfa",
                  textTransform: "uppercase", letterSpacing: "1px",
                  fontFamily: "'Space Mono', monospace",
                }}>Tidigare sökningar ({searches.length})</span>
                <span style={{ fontSize: 14, color: "#475569" }}>{showSearches ? "▲" : "▼"}</span>
              </button>
              {showSearches && (
                <div style={{ marginTop: 10 }}>
                  {searches.map((s) => (
                    <SearchHistoryCard
                      key={s.id}
                      search={s}
                      onDelete={handleDeleteSearch}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div style={{
              padding: "16px", borderRadius: 12, marginBottom: 24,
              background: "rgba(251, 191, 36, 0.04)",
              border: "1px solid rgba(251, 191, 36, 0.15)",
            }}>
              <h3 style={{
                fontSize: 12, fontWeight: 600, color: "#fbbf24",
                textTransform: "uppercase", letterSpacing: "1px",
                margin: "0 0 10px", fontFamily: "'Space Mono', monospace",
              }}>Kommande deadlines</h3>
              {upcomingDeadlines.map((g) => {
                const days = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={g.id} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "6px 0", fontSize: 13,
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}>
                    <span style={{ color: "#cbd5e1" }}>{g.grant_name}</span>
                    <span style={{ color: days <= 7 ? "#ef4444" : days <= 30 ? "#fbbf24" : "#64748b", fontWeight: 500 }}>
                      {new Date(g.deadline).toLocaleDateString("sv-SE")} ({days}d)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 16,
            overflowX: "auto", paddingBottom: 4,
          }}>
            <button
              onClick={() => setFilter("all")}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                background: filter === "all" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                color: filter === "all" ? "#e2e8f0" : "#64748b",
              }}
            >Alla ({grants.length})</button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = grants.filter((g) => g.status === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                    background: filter === key ? cfg.bg : "rgba(255,255,255,0.03)",
                    color: filter === key ? cfg.color : "#64748b",
                  }}
                >{cfg.label} ({count})</button>
              );
            })}
          </div>

          {/* Grant list */}
          {loadingGrants ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Laddar bidrag...</p>
          ) : filteredGrants.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              color: "#64748b",
            }}>
              <p style={{ fontSize: 15, marginBottom: 16 }}>
                {grants.length === 0
                  ? "Du har inga sparade bidrag ännu."
                  : "Inga bidrag med den valda statusen."}
              </p>
              {grants.length === 0 && (
                <a href="/" style={{
                  display: "inline-block", padding: "12px 24px", borderRadius: 12,
                  background: "linear-gradient(135deg, #38bdf8, #10b981)",
                  color: "#0a1628", fontWeight: 700, textDecoration: "none",
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                }}>Gör quizet och hitta bidrag</a>
              )}
            </div>
          ) : (
            filteredGrants.map((grant) => (
              <GrantCard
                key={grant.id}
                grant={grant}
                onUpdate={loadGrants}
                onDelete={handleDelete}
                userId={user.id}
              />
            ))
          )}

          {/* Bottom actions */}
          {grants.length > 0 && (
            <div style={{
              display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap",
            }}>
              <button
                onClick={handleExportCSV}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Ladda ner CSV (Google Sheets)</button>
              <button
                onClick={handleExportJSON}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Exportera all data (JSON)</button>
            </div>
          )}

          {/* Footer links */}
          <div style={{
            marginTop: 32, paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex", justifyContent: "center", gap: 16,
            fontSize: 12, color: "#475569",
          }}>
            <a href="/integritetspolicy" style={{ color: "#475569", textDecoration: "none" }}>Integritetspolicy</a>
            <a href="/" style={{ color: "#475569", textDecoration: "none" }}>Bidragsguiden</a>
          </div>
        </div>
      </div>
    </>
  );
}
