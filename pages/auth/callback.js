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

    // Check for error in URL
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("error=") || search.includes("error=")) {
        const params = new URLSearchParams(hash.includes("error=") ? hash.substring(1) : search);
        const error = params.get("error_description") || params.get("error") || "Okant fel";
        console.error("OAuth error:", error);
        setStatus("Inloggning misslyckades: " + error);
        setTimeout(() => router.replace("/login"), 3000);
        return;
      }
    }

    let done = false;

    const redirect = (user) => {
      if (done) return;
      done = true;
      // Clean URL
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      const hasPendingQuiz = typeof window !== "undefined"
        && localStorage.getItem("bg_pending_quiz");
      if (hasPendingQuiz) {
        setStatus("Inloggad! Aterstaller ditt quiz...");
        router.replace("/");
      } else {
        setStatus("Inloggad! Skickar dig vidare...");
        router.replace("/dashboard");
      }
    };

    async function handleAuth() {
      const code = new URLSearchParams(window.location.search).get("code");

      // Step 1: Check if session already exists (AuthProvider may have handled it)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        redirect(session.user);
        return;
      }

      // Step 2: Try PKCE code exchange explicitly
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session?.user) {
            redirect(data.session.user);
            return;
          }
          if (error) {
            console.warn("Code exchange error:", error.message);
            // Code might already be consumed by detectSessionInUrl — wait and retry
          }
        } catch (err) {
          console.warn("Code exchange exception:", err);
        }
      }

      // Step 3: Wait and check again (detectSessionInUrl might be processing)
      await new Promise((r) => setTimeout(r, 1500));
      const { data: { session: retrySession } } = await supabase.auth.getSession();
      if (retrySession?.user) {
        redirect(retrySession.user);
        return;
      }

      // Step 4: Last resort — listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (session?.user) {
            redirect(session.user);
            subscription.unsubscribe();
          }
        }
      );

      // Step 5: Final timeout
      setTimeout(() => {
        if (!done) {
          subscription.unsubscribe();
          setStatus("Kunde inte logga in. Forsok igen.");
          setTimeout(() => router.replace("/login"), 2000);
        }
      }, 10000);
    }

    handleAuth();
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
