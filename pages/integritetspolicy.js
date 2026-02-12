import { useState } from "react";
import Head from "next/head";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { exportUserData } from "../lib/dashboard";

export default function Integritetspolicy() {
  const { user, profile, deleteAccount } = useAuth();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      showToast("Något gick fel. Försök igen eller kontakta oss.", "error");
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    const data = await exportUserData(user.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidragsguiden-min-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: "0 0 10px" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>{children}</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Integritetspolicy — Bidragsguiden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#e2e8f0",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 16px" }}>
          {/* Header */}
          <a href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            textDecoration: "none", marginBottom: 32,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg, #38bdf8, #10b981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#0a1628",
              fontFamily: "'Space Mono', monospace",
            }}>B</div>
            <span style={{ fontSize: 14, color: "#64748b" }}>Tillbaka till Bidragsguiden</span>
          </a>

          <h1 style={{
            fontSize: 28, fontWeight: 700, margin: "0 0 8px",
            background: "linear-gradient(90deg, #38bdf8, #10b981)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "'Space Mono', monospace",
          }}>Integritetspolicy</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 32px" }}>
            Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}
          </p>

          <Section title="Vad vi samlar in">
            <p style={{ margin: "0 0 8px" }}>
              <strong style={{ color: "#cbd5e1" }}>Utan konto:</strong> Ett anonymt sessions-ID (UUID) skapas och lagras
              i din webbläsares localStorage. Dina quiz-svar och AI-resultat kopplas till detta ID. Vi kan inte
              identifiera dig som person baserat på detta.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#cbd5e1" }}>Med konto (Google-inloggning):</strong> Vi sparar ditt namn och
              din e-postadress från ditt Google-konto, samt dina sparade bidrag, checklistor och anteckningar.
            </p>
          </Section>

          <Section title="Varför vi samlar in data">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}>Visa dina quiz-resultat och sökhistorik</li>
              <li style={{ marginBottom: 6 }}>Spara dina bidrag, checklistor och anteckningar i din dashboard</li>
              <li style={{ marginBottom: 6 }}>Skicka påminnelser om du anmält dig (valfritt)</li>
            </ul>
          </Section>

          <Section title="Rättslig grund">
            <p style={{ margin: 0 }}>
              Vi behandlar dina personuppgifter baserat på ditt <strong style={{ color: "#cbd5e1" }}>samtycke</strong> (GDPR
              artikel 6.1a). Du ger ditt samtycke genom att aktivt kryssa i rutan på inloggningssidan innan du loggar in.
              Du kan när som helst återkalla ditt samtycke genom att radera ditt konto, varpå all din data tas bort permanent.
            </p>
          </Section>

          <Section title="AI-behandling">
            <p style={{ margin: 0 }}>
              Dina anonyma quiz-svar skickas till Anthropics Claude API för analys. Anthropic lagrar inte
              API-konversationer och använder inte din data för att träna sina modeller. Inga personuppgifter
              skickas till AI:n — bara dina quiz-svar (bolagsform, bransch, etc).
            </p>
          </Section>

          <Section title="Var data lagras">
            <p style={{ margin: 0 }}>
              All data lagras i en Supabase-databas (PostgreSQL) med krypterad anslutning.
              Databasen hostas inom EU. Supabase har Row Level Security (RLS) aktiverat, vilket innebär
              att varje användare bara kan se sin egen data.
            </p>
          </Section>

          <Section title="Hur länge vi sparar data">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Anonyma sessioner</strong> — quiz-svar och
                resultat sparas i 90 dagar, sedan raderas de automatiskt</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Användarkonton</strong> — din data sparas
                så länge du har ett aktivt konto. Vid kontoborttagning raderas all data omedelbart och permanent.</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Användningsstatistik</strong> — daglig
                sökräknare raderas automatiskt efter 90 dagar</li>
            </ul>
          </Section>

          <Section title="Tredjeparter">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Supabase</strong> — databaslagring och autentisering</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Anthropic</strong> — AI-analys av quiz-svar (ingen persondata)</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Vercel</strong> — hosting av webbapplikationen</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Google</strong> — inloggning via OAuth (valfritt)</li>
            </ul>
            <p style={{ margin: "8px 0 0" }}>Vi säljer aldrig din data till tredje part.</p>
          </Section>

          <Section title="Spårning och cookies">
            <p style={{ margin: 0 }}>
              Vi använder inga analytics-verktyg, inga spårningscookies och inga reklamskript.
              Det enda som lagras lokalt är ditt anonyma sessions-ID i localStorage.
            </p>
          </Section>

          <Section title="Dina rättigheter (GDPR)">
            <p style={{ margin: "0 0 10px" }}>Enligt GDPR har du rätt att:</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Tillgång</strong> — se och ladda ner all data vi har om dig</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Rättelse</strong> — begära att felaktig data korrigeras</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Radering</strong> — ta bort ditt konto och all tillhörande data permanent</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Dataportabilitet</strong> — ladda ner en kopia i maskinläsbart format (JSON)</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Återkalla samtycke</strong> — du kan när som helst radera ditt konto</li>
              <li style={{ marginBottom: 6 }}><strong style={{ color: "#cbd5e1" }}>Klaga</strong> — du har rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY)</li>
            </ul>
            <p style={{ margin: "10px 0 0" }}>
              Du kan utöva dina rättigheter direkt i appen (se nedan) eller genom att kontakta oss.
            </p>
          </Section>

          {/* User actions */}
          {user && (
            <div style={{
              padding: "24px", borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 28,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: "0 0 6px" }}>
                Hantera din data
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
                Inloggad som {profile?.email || user.email}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleExport}
                  style={{
                    padding: "10px 18px", borderRadius: 10,
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    color: "#38bdf8", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >Ladda ner all min data</button>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: "10px 18px", borderRadius: 10,
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >Radera mitt konto</button>
                ) : (
                  <div style={{
                    padding: "14px", borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    flex: "1 1 100%",
                  }}>
                    <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 10px", fontWeight: 600 }}>
                      Är du säker? All din data raderas permanent — bidrag, checklistor, anteckningar, allt. Detta kan inte ångras.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          padding: "8px 16px", borderRadius: 8,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#94a3b8", fontSize: 13, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Avbryt</button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                          padding: "8px 16px", borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.2)",
                          border: "none",
                          color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                          opacity: deleting ? 0.5 : 1,
                        }}
                      >{deleting ? "Raderar..." : "Ja, radera allt permanent"}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Section title="Kontakt och tillsynsmyndighet">
            <p style={{ margin: "0 0 10px" }}>
              Har du frågor om hur vi hanterar din data? Kontakta oss via e-post
              eller GitHub.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              Om du inte är nöjd med hur vi hanterar dina personuppgifter har du rätt att
              lämna klagomål till:
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#cbd5e1" }}>Integritetsskyddsmyndigheten (IMY)</strong><br />
              imy.se | imy@imy.se<br />
              Box 8114, 104 20 Stockholm
            </p>
          </Section>

          {/* Footer */}
          <div style={{
            marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "#475569",
          }}>
            <a href="/anvandarvillkor" style={{ color: "#475569", textDecoration: "none" }}>Användarvillkor</a>
            <span style={{ color: "#334155" }}>|</span>
            <a href="/" style={{ color: "#475569", textDecoration: "none" }}>Bidragsguiden</a>
          </div>
        </div>
      </div>
    </>
  );
}
