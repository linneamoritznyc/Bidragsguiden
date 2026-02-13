import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Loggar in...");

  useEffect(() => {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    // Check for error in URL (hash or query params)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      const errorInHash = hash.includes("error=");
      const errorInQuery = search.includes("error=");
      if (errorInHash || errorInQuery) {
        const params = new URLSearchParams(errorInHash ? hash.substring(1) : search.substring(1));
        const error = params.get("error_description") || params.get("error") || "Okänt fel";
        console.error("OAuth error:", error);
        setStatus("Inloggning misslyckades: " + error);
        setTimeout(() => router.replace("/login"), 3000);
        return;
      }
    }

    let redirected = false;

    const handleSuccess = (user) => {
      if (redirected) return;
      redirected = true;
      // Clean URL (remove tokens/code from address bar)
      if (typeof window !== "undefined" && (window.location.hash || window.location.search.includes("code="))) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      // If user was mid-quiz before logging in, send them back to resume
      const hasPendingQuiz = typeof window !== "undefined"
        && localStorage.getItem("bg_pending_quiz");
      if (hasPendingQuiz) {
        setStatus("Inloggad! Återställer ditt quiz...");
        router.replace("/");
      } else {
        setStatus("Inloggad! Skickar dig vidare...");
        router.replace("/dashboard");
      }
    };

    const handleFailure = (msg) => {
      if (redirected) return;
      redirected = true;
      setStatus(msg || "Kunde inte logga in. Försök igen.");
      setTimeout(() => router.replace("/login"), 2000);
    };

    // Strategy 1: Handle PKCE code exchange explicitly (when URL has ?code=)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error) {
            console.error("Code exchange error:", error);
            // Don't fail immediately — the AuthProvider might handle it via onAuthStateChange
          }
          if (data?.session?.user) {
            handleSuccess(data.session.user);
          }
        })
        .catch((err) => {
          console.error("Code exchange exception:", err);
        });
    }

    // Strategy 2: Listen for auth state changes (handles implicit flow + fallback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          handleSuccess(session.user);
        } else if (event === "INITIAL_SESSION" && !code) {
          // Only fail on INITIAL_SESSION if there's no code to exchange
          // (code exchange might still be in progress)
          handleFailure();
        }
      }
    );

    // Safety timeout (longer to account for slow code exchange)
    const timeout = setTimeout(() => {
      handleFailure("Tog för lång tid. Försök igen.");
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "linear-gradient(135deg, #38bdf8, #10b981)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 30px rgba(56, 189, 248, 0.25)",
      }}>
        <span style={{
          fontSize: 22, fontWeight: 700, color: "#0a1628",
          fontFamily: "'Space Mono', monospace",
        }}>B</span>
      </div>
      <p style={{ color: "#94a3b8", fontSize: 15 }}>{status}</p>
    </div>
  );
}
