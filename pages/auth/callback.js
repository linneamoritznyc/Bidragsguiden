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

    // Check for error in URL hash (e.g. #error=access_denied)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("error=")) {
        const params = new URLSearchParams(hash.substring(1));
        const error = params.get("error_description") || params.get("error") || "Okänt fel";
        console.error("OAuth error:", error);
        setStatus("Inloggning misslyckades: " + error);
        setTimeout(() => router.replace("/login"), 3000);
        return;
      }
    }

    // Listen for auth state — Supabase will process the hash tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Clean URL hash (remove tokens from address bar)
          if (typeof window !== "undefined" && window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
          setStatus("Inloggad! Skickar dig vidare...");
          router.replace("/dashboard");
        } else if (event === "INITIAL_SESSION") {
          // No session after processing — auth failed silently
          setStatus("Kunde inte logga in. Försök igen.");
          setTimeout(() => router.replace("/login"), 2000);
        }
      }
    );

    // Safety timeout
    const timeout = setTimeout(() => {
      setStatus("Tog för lång tid. Försök igen.");
      router.replace("/login");
    }, 8000);

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
