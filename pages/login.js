import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../lib/auth";

const BENEFITS = [
  { title: "Sparade bidrag", desc: "Samla alla relevanta bidrag i din egen dashboard" },
  { title: "Checklistor", desc: "Skapa to-do-listor för varje bidragsansökan" },
  { title: "Frågor direkt", desc: "Ställ frågor om specifika bidrag och få svar direkt" },
  { title: "5 sökningar/dag", desc: "Dubbelt så många sökningar jämfört med utan konto" },
];

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bg_remember_me", rememberMe ? "true" : "false");
      // GDPR: mark consent as pending so auth callback can save the timestamp
      localStorage.setItem("bg_gdpr_consent_pending", "true");
    }
    await signInWithGoogle();
  };

  if (loading) {
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

  return (
    <>
      <Head>
        <title>Logga in — Bidragsguiden</title>
        <meta name="description" content="Logga in på Bidragsguiden för att spara bidrag, skapa checklistor och få 5 sökningar per dag." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Logga in — Bidragsguiden" />
        <meta property="og:description" content="Skapa ett gratis konto och spara dina bidrag med checklistor och deadlines." />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 16px",
      }}>
        <div style={{ maxWidth: 480, width: "100%" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, margin: "0 auto 16px",
              borderRadius: 14, background: "linear-gradient(135deg, #38bdf8, #10b981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 40px rgba(56, 189, 248, 0.2)",
            }}>
              <span style={{
                fontSize: 24, fontWeight: 700, color: "#0a1628",
                fontFamily: "'Space Mono', monospace",
              }}>B</span>
            </div>

            <h1 style={{
              fontSize: 22, fontWeight: 700, margin: "0 0 6px",
              background: "linear-gradient(90deg, #38bdf8, #10b981)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontFamily: "'Space Mono', monospace",
            }}>Bidragsguiden</h1>

            <p style={{
              fontSize: 14, color: "#94a3b8", margin: 0, lineHeight: 1.5,
            }}>
              Skapa ett gratis konto och få mer ut av dina bidragssökningar
            </p>
          </div>

          {/* Login card */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "28px 24px",
            marginBottom: 16,
          }}>
            {/* Benefits grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 12, marginBottom: 24,
            }}>
              {BENEFITS.map((b, i) => (
                <div key={i} style={{
                  padding: "14px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "#e2e8f0",
                    marginBottom: 4,
                  }}>{b.title}</div>
                  <div style={{
                    fontSize: 11, color: "#64748b", lineHeight: 1.4,
                  }}>{b.desc}</div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{
              height: 1, background: "rgba(255,255,255,0.06)",
              margin: "0 0 24px",
            }} />

            {/* Privacy consent checkbox (GDPR: must not be pre-checked) */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              marginBottom: 20, cursor: "pointer",
              fontSize: 13, color: "#94a3b8", lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(e) => setAcceptedPolicy(e.target.checked)}
                style={{
                  cursor: "pointer", accentColor: "#38bdf8",
                  marginTop: 3, flexShrink: 0,
                }}
              />
              <span>
                Jag har läst och godkänner{" "}
                <a href="/integritetspolicy" target="_blank" rel="noopener" style={{
                  color: "#38bdf8", textDecoration: "underline",
                }}>integritetspolicyn</a>.
                {" "}Vi sparar ditt namn, e-post och dina bidragsval.
              </span>
            </label>

            {/* Google sign-in button */}
            <button
              onClick={handleLogin}
              disabled={!acceptedPolicy}
              style={{
                width: "100%", padding: "14px 24px",
                background: acceptedPolicy ? "#fff" : "rgba(255,255,255,0.15)",
                color: acceptedPolicy ? "#1f2937" : "#64748b",
                border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: acceptedPolicy ? "pointer" : "not-allowed",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                transition: "all 0.2s",
                boxShadow: acceptedPolicy ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                opacity: acceptedPolicy ? 1 : 0.6,
              }}
              onMouseOver={(e) => {
                if (!acceptedPolicy) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
              }}
              onMouseOut={(e) => {
                if (!acceptedPolicy) return;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Logga in med Google
            </button>

            {/* Remember me checkbox */}
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, marginTop: 14, cursor: "pointer",
              fontSize: 13, color: "#64748b",
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "#38bdf8" }}
              />
              Kom ihåg mig
            </label>
          </div>

          {/* Footer info */}
          <div style={{
            textAlign: "center", padding: "0 8px",
          }}>
            <a
              href="/"
              style={{
                display: "inline-block",
                fontSize: 13, color: "#64748b", textDecoration: "none",
                padding: "8px 16px", borderRadius: 8,
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "#94a3b8"}
              onMouseOut={(e) => e.currentTarget.style.color = "#64748b"}
            >
              Tillbaka till quizet (utan konto)
            </a>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 12 }}>
              <a href="/integritetspolicy" style={{ color: "#475569", textDecoration: "none" }}>Integritetspolicy</a>
              <a href="/anvandarvillkor" style={{ color: "#475569", textDecoration: "none" }}>Anv&auml;ndarvillkor</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
