import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    // Save remember-me preference before redirecting to Google
    if (typeof window !== "undefined") {
      localStorage.setItem("bg_remember_me", rememberMe ? "true" : "false");
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
        <title>Logga in -- Bidragsguiden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          maxWidth: 420, width: "100%", padding: "0 16px",
          textAlign: "center",
        }}>
          {/* Logo */}
          <div style={{
            width: 64, height: 64, margin: "0 auto 20px",
            borderRadius: 16, background: "linear-gradient(135deg, #38bdf8, #10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(56, 189, 248, 0.25)",
          }}>
            <span style={{
              fontSize: 28, fontWeight: 700, color: "#0a1628",
              fontFamily: "'Space Mono', monospace",
            }}>B</span>
          </div>

          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: "0 0 8px",
            background: "linear-gradient(90deg, #38bdf8, #10b981)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "'Space Mono', monospace",
          }}>Bidragsguiden</h1>

          <p style={{
            fontSize: 15, color: "#94a3b8", margin: "0 0 32px", lineHeight: 1.6,
          }}>
            Logga in för att spara dina bidrag, skapa checklistor och hålla koll på deadlines.
          </p>

          {/* Google sign-in button */}
          <button
            onClick={handleLogin}
            style={{
              width: "100%", padding: "14px 24px",
              background: "#fff", color: "#1f2937",
              border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
            }}
            onMouseOut={(e) => {
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
            gap: 8, marginTop: 16, cursor: "pointer",
            fontSize: 14, color: "#94a3b8",
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#38bdf8" }}
            />
            Kom ihåg mig
          </label>

          <div style={{
            marginTop: 20, padding: "16px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12, color: "#475569", lineHeight: 1.5,
          }}>
            Genom att logga in godkänner du vår{" "}
            <a href="/integritetspolicy" style={{ color: "#38bdf8", textDecoration: "none" }}>
              integritetspolicy
            </a>.
            Vi sparar bara det som behövs för att visa dina bidrag och checklistor.
          </div>

          {/* Link back to quiz */}
          <a
            href="/"
            style={{
              display: "inline-block", marginTop: 20,
              fontSize: 13, color: "#64748b", textDecoration: "none",
            }}
          >
            Tillbaka till quizet (utan konto)
          </a>
        </div>
      </div>
    </>
  );
}
