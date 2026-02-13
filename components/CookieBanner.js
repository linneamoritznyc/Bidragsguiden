import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("bg_cookie_consent");
      if (!consent) setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("bg_cookie_consent", "accepted");
    localStorage.setItem("bg_cookie_consent_at", new Date().toISOString());
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("bg_cookie_consent", "declined");
    localStorage.setItem("bg_cookie_consent_at", new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "#fff", borderTop: "1px solid #e2e8f0",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
      padding: "16px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
          Vi använder cookies
        </div>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Bidragsguiden använder nödvändiga cookies för att tjänsten ska fungera,
          samt analysverktyg för att förbättra upplevelsen.
          Läs mer i vår{" "}
          <a href="/integritetspolicy" style={{ color: "#3b82f6", textDecoration: "none" }}>
            integritetspolicy
          </a>.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            padding: "8px 20px", borderRadius: 6,
            background: "#fff", border: "1px solid #e2e8f0",
            color: "#64748b", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}
        >Bara nödvändiga</button>
        <button
          onClick={accept}
          style={{
            padding: "8px 20px", borderRadius: 6,
            background: "#0f172a", border: "none",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}
        >Acceptera alla</button>
      </div>
    </div>
  );
}
