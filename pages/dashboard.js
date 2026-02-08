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
  applying: { label: "Förbereder ansökan", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  applied: { label: "Ansökt", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  granted: { label: "Beviljad", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  rejected: { label: "Nekad", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  archived: { label: "Arkiverad", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
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
      background: "#fff",
      border: `1px solid ${st.border}`,
      borderRadius: 12, padding: "20px",
      marginBottom: 12,
      borderLeft: `3px solid ${st.color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s",
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
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px", color: "#111827" }}>
              {grant.grant_name}
            </h3>
            <p style={{ fontSize: 13, color: "#2563eb", margin: 0, fontWeight: 500 }}>
              {grant.grant_agency}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: st.color,
              background: st.bg, padding: "3px 10px", borderRadius: 12,
              border: `1px solid ${st.border}`,
            }}>{st.label}</span>
            {doneCount > 0 && (
              <span style={{ fontSize: 11, color: "#6b7280" }}>{doneCount}/{checklist.length}</span>
            )}
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Quick info row */}
        <div style={{
          display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: "#6b7280",
          flexWrap: "wrap",
        }}>
          {grantData.amount && <span>Belopp: {grantData.amount}</span>}
          {deadline && (
            <span style={{ color: new Date(deadline) < new Date() ? "#dc2626" : "#d97706" }}>
              Deadline: {new Date(deadline).toLocaleDateString("sv-SE")}
            </span>
          )}
          {grantData.category && <span>{grantData.category}</span>}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
          {/* Description */}
          {grantData.description && (
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 14px", lineHeight: 1.6 }}>
              {grantData.description}
            </p>
          )}

          {/* Eligibility */}
          {grantData.eligibility_summary && (
            <div style={{
              padding: "12px 14px", borderRadius: 8, marginBottom: 14,
              background: "#f0f9ff", border: "1px solid #bae6fd",
            }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 600 }}>
                Vem kan söka
              </div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                {grantData.eligibility_summary}
              </div>
            </div>
          )}

          {/* Link */}
          {grantData.url && (
            <a href={grantData.url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", fontSize: 13, color: "#2563eb",
              textDecoration: "none", fontWeight: 500, marginBottom: 16,
            }}>Läs mer hos {grant.grant_agency} →</a>
          )}

          {/* Status selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  style={{
                    padding: "5px 12px", borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    background: grant.status === key ? cfg.bg : "#f9fafb",
                    border: `1px solid ${grant.status === key ? cfg.border : "#e5e7eb"}`,
                    color: grant.status === key ? cfg.color : "#9ca3af",
                    transition: "all 0.2s",
                  }}
                >{cfg.label}</button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>Deadline</div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#fff", color: "#111827",
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>
              Checklista ({doneCount}/{checklist.length})
            </div>
            {checklist.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 0", borderBottom: "1px solid #f3f4f6",
              }}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggle(item)}
                  style={{ marginTop: 3, cursor: "pointer", accentColor: "#059669" }}
                />
                <span style={{
                  flex: 1, fontSize: 14, color: item.done ? "#9ca3af" : "#374151",
                  textDecoration: item.done ? "line-through" : "none",
                  lineHeight: 1.4,
                }}>{item.label}</span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  style={{
                    background: "none", border: "none", color: "#d1d5db",
                    fontSize: 14, cursor: "pointer", padding: "2px 6px",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.color = "#dc2626"; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = "#d1d5db"; }}
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
                  border: "1px solid #d1d5db",
                  background: "#fff", color: "#111827",
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <button
                onClick={handleAddItem}
                style={{
                  padding: "8px 14px", borderRadius: 8,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff", color: "#2563eb",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >+</button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>Egna anteckningar</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Skriv anteckningar om detta bidrag..."
              style={{
                width: "100%", minHeight: 70, padding: "10px 12px",
                borderRadius: 8, border: "1px solid #d1d5db",
                background: "#fff", color: "#374151",
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                resize: "vertical", lineHeight: 1.5,
              }}
            />
          </div>

          {/* Delete */}
          <button
            onClick={() => { if (confirm("Vill du ta bort detta bidrag?")) { onDelete(grant.id); } }}
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8, padding: "8px 14px",
              color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer",
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
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12, padding: "20px", marginBottom: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14,
      }}>
        <h3 style={{
          fontSize: 13, fontWeight: 700, color: "#111827",
          textTransform: "uppercase", letterSpacing: "0.5px",
          margin: 0,
        }}>Din företagsprofil</h3>
        {quizData.last_search_at && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Senast sökt: {new Date(quizData.last_search_at).toLocaleDateString("sv-SE")}
          </span>
        )}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 8,
      }}>
        {displayFields.map((key) => {
          if (!answers[key]) return null;
          const label = QUIZ_LABELS[key]?._title || key;
          const value = getAnswerLabel(key, answers[key]);
          return (
            <div key={key} style={{
              padding: "10px 12px", borderRadius: 8,
              background: "#f9fafb",
              border: "1px solid #f3f4f6",
            }}>
              <div style={{
                fontSize: 10, color: "#9ca3af", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600,
              }}>{label}</div>
              <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{value}</div>
            </div>
          );
        })}
        {answers.kommun && answers.kommun !== "prefer_not_to_say" && (
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: "#f9fafb", border: "1px solid #f3f4f6",
          }}>
            <div style={{
              fontSize: 10, color: "#9ca3af", textTransform: "uppercase",
              letterSpacing: "0.5px", marginBottom: 3, fontWeight: 600,
            }}>Kommun</div>
            <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{answers.kommun}</div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <a href="/" style={{
          fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 500,
        }}>Gör en ny sökning →</a>
      </div>
    </div>
  );
}

function SearchHistoryCard({ search, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const answers = search.answers || {};
  const result = search.result || {};
  const grantCount = result.benefits?.length || 0;
  const date = new Date(search.created_at).toLocaleDateString("sv-SE", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleDownloadPDF = () => {
    if (result?.benefits) downloadAsPDF(result, answers);
  };

  const handleDownloadTXT = () => {
    if (result?.benefits) {
      const text = resultToText(result, answers);
      downloadAsFile(text, `bidragsguiden-${new Date(search.created_at).toISOString().slice(0, 10)}.txt`);
    }
  };

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 10, padding: "14px 16px", marginBottom: 8,
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
            {getAnswerLabel("industry", answers.industry) || "Sökning"}{" "}
            {answers.region && <span style={{ color: "#6b7280", fontWeight: 400 }}>i {getAnswerLabel("region", answers.region)}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            {date} -- {grantCount} bidrag{search.refine_count > 0 ? `, förfinad ${search.refine_count}x` : ""}
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
          {result.summary && (
            <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 12px", lineHeight: 1.6 }}>
              {result.summary}
            </p>
          )}

          {result.benefits && result.benefits.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>
                Bidrag från denna sökning
              </div>
              {result.benefits.slice(0, 5).map((b, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: "1px solid #f9fafb",
                  fontSize: 13,
                }}>
                  <span style={{ color: "#374151" }}>{b.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: b.priority === "high" ? "#059669" : b.priority === "medium" ? "#2563eb" : "#9ca3af",
                  }}>{b.priority === "high" ? "Hög" : b.priority === "medium" ? "Medel" : "Låg"}</span>
                </div>
              ))}
              {result.benefits.length > 5 && (
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  +{result.benefits.length - 5} till...
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={`/?prefill=history&searchId=${search.id}`}
              style={{
                padding: "7px 14px", borderRadius: 8,
                background: "#eff6ff", border: "1px solid #bfdbfe",
                color: "#2563eb", fontSize: 12, fontWeight: 600,
                textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
              }}
            >Sök igen</a>
            <button
              onClick={handleDownloadPDF}
              style={{
                padding: "7px 14px", borderRadius: 8,
                background: "#f9fafb", border: "1px solid #e5e7eb",
                color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >PDF</button>
            <button
              onClick={handleDownloadTXT}
              style={{
                padding: "7px 14px", borderRadius: 8,
                background: "#f9fafb", border: "1px solid #e5e7eb",
                color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >TXT</button>
            <button
              onClick={() => { if (confirm("Ta bort denna sökning?")) onDelete(search.id); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                background: "#fef2f2", border: "1px solid #fecaca",
                color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer",
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

  const handleDownloadAllPDF = () => {
    if (grants.length === 0) return;
    const fakeResult = {
      benefits: grants.map((g) => ({
        name: g.grant_name,
        agency: g.grant_agency || "",
        ...(g.grant_data || {}),
      })),
      summary: `Du har ${grants.length} sparade bidrag i din Bidragsguiden.`,
      total_potential: "",
      recommendations: [],
    };
    downloadAsPDF(fakeResult, {});
  };

  const handleDownloadAllTXT = () => {
    if (grants.length === 0) return;
    const fakeResult = {
      benefits: grants.map((g) => ({
        name: g.grant_name,
        agency: g.grant_agency || "",
        ...(g.grant_data || {}),
      })),
      summary: `Du har ${grants.length} sparade bidrag i din Bidragsguiden.`,
    };
    const text = resultToText(fakeResult, {});
    downloadAsFile(text, `bidragsguiden-sparade-${new Date().toISOString().slice(0, 10)}.txt`);
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
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidragsguiden-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !user) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#9ca3af", fontFamily: "'DM Sans', sans-serif",
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
        <title>Mina bidrag — Bidragsguiden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#111827",
      }}>
        {/* Top navigation bar */}
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{
            maxWidth: 800, margin: "0 auto", padding: "12px 20px",
            display: "flex", justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "linear-gradient(135deg, #2563eb, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
                fontFamily: "'Space Mono', monospace",
              }}>B</div>
              <span style={{
                fontSize: 15, fontWeight: 700, color: "#111827",
                fontFamily: "'Space Mono', monospace",
              }}>Bidragsguiden</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                {profile?.display_name || profile?.email || ""}
              </span>
              <a href="/" style={{
                padding: "6px 14px", borderRadius: 8,
                background: "#2563eb", color: "#fff",
                fontSize: 12, fontWeight: 600,
                textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
              }}>Ny sökning</a>
              <button
                onClick={signOut}
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  color: "#6b7280", fontSize: 12, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Logga ut</button>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: 800, margin: "0 auto", padding: "28px 20px",
        }}>
          {/* Page title */}
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: "0 0 24px",
            color: "#111827",
          }}>Mina bidrag</h1>

          {/* Stats overview */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12, marginBottom: 24,
          }}>
            {[
              { label: "Totalt", value: grants.length, color: "#111827", bg: "#fff" },
              { label: "Nya", value: grants.filter((g) => g.status === "new").length, color: "#2563eb", bg: "#eff6ff" },
              { label: "Undersöker", value: grants.filter((g) => g.status === "investigating").length, color: "#d97706", bg: "#fffbeb" },
              { label: "Ansökt", value: grants.filter((g) => g.status === "applied").length, color: "#2563eb", bg: "#eff6ff" },
              { label: "Beviljade", value: grants.filter((g) => g.status === "granted").length, color: "#059669", bg: "#ecfdf5" },
            ].map((s) => (
              <div key={s.label} style={{
                padding: "16px", borderRadius: 10,
                background: s.bg,
                border: "1px solid #e5e7eb",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
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
                  width: "100%", padding: "14px 16px", borderRadius: 10,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 700, color: "#111827",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}>Tidigare sökningar ({searches.length})</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{showSearches ? "▲" : "▼"}</span>
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
              padding: "16px 20px", borderRadius: 10, marginBottom: 24,
              background: "#fffbeb", border: "1px solid #fde68a",
            }}>
              <h3 style={{
                fontSize: 13, fontWeight: 700, color: "#92400e",
                textTransform: "uppercase", letterSpacing: "0.5px",
                margin: "0 0 12px",
              }}>Kommande deadlines</h3>
              {upcomingDeadlines.map((g) => {
                const days = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={g.id} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 0", fontSize: 14,
                    borderBottom: "1px solid #fef3c7",
                  }}>
                    <span style={{ color: "#374151" }}>{g.grant_name}</span>
                    <span style={{
                      color: days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "#6b7280",
                      fontWeight: 600, fontSize: 13,
                    }}>
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
                padding: "7px 16px", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                background: filter === "all" ? "#111827" : "#fff",
                border: `1px solid ${filter === "all" ? "#111827" : "#d1d5db"}`,
                color: filter === "all" ? "#fff" : "#6b7280",
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
                    padding: "7px 16px", borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                    background: filter === key ? cfg.bg : "#fff",
                    border: `1px solid ${filter === key ? cfg.border : "#d1d5db"}`,
                    color: filter === key ? cfg.color : "#6b7280",
                  }}
                >{cfg.label} ({count})</button>
              );
            })}
          </div>

          {/* Grant list */}
          {loadingGrants ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Laddar bidrag...</p>
          ) : filteredGrants.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}>
              <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 6 }}>
                {grants.length === 0
                  ? "Du har inga sparade bidrag ännu."
                  : "Inga bidrag med den valda statusen."}
              </p>
              {grants.length === 0 && (
                <>
                  <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 20px" }}>
                    Gör quizet för att hitta bidrag som passar ditt företag.
                  </p>
                  <a href="/" style={{
                    display: "inline-block", padding: "12px 28px", borderRadius: 10,
                    background: "#2563eb", color: "#fff",
                    fontWeight: 700, textDecoration: "none",
                    fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  }}>Hitta bidrag</a>
                </>
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

          {/* Download actions */}
          {grants.length > 0 && (
            <div style={{
              marginTop: 20, padding: "16px 20px", borderRadius: 10,
              background: "#fff", border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Ladda ner dina bidrag
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleDownloadAllPDF}
                  style={{
                    flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 8,
                    background: "#2563eb", border: "none",
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >Ladda ner PDF</button>
                <button
                  onClick={handleDownloadAllTXT}
                  style={{
                    flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 8,
                    background: "#f9fafb", border: "1px solid #d1d5db",
                    color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >Ladda ner TXT</button>
                <button
                  onClick={handleExportCSV}
                  style={{
                    flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 8,
                    background: "#f9fafb", border: "1px solid #d1d5db",
                    color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >Ladda ner CSV</button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: 32, paddingTop: 16,
            borderTop: "1px solid #e5e7eb",
            display: "flex", justifyContent: "center", gap: 20,
            fontSize: 13, color: "#9ca3af",
          }}>
            <a href="/integritetspolicy" style={{ color: "#9ca3af", textDecoration: "none" }}>Integritetspolicy</a>
            <a href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Bidragsguiden</a>
          </div>
        </div>
      </div>
    </>
  );
}
