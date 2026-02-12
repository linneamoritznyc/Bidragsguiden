import Head from "next/head";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Sidan hittades inte -- Bidragsguiden</title>
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 20,
        fontFamily: "'DM Sans', sans-serif",
        padding: 20,
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
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: 48, fontWeight: 700, margin: "0 0 8px",
            background: "linear-gradient(90deg, #38bdf8, #10b981)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "'Space Mono', monospace",
          }}>404</h1>
          <p style={{ color: "#94a3b8", fontSize: 15, margin: "0 0 24px" }}>
            Sidan kunde inte hittas.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/" style={{
            padding: "10px 24px", borderRadius: 8,
            background: "linear-gradient(135deg, #38bdf8, #10b981)",
            color: "#0a1628", fontSize: 14, fontWeight: 600,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}>Till startsidan</a>
          <a href="/dashboard" style={{
            padding: "10px 24px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", fontSize: 14, fontWeight: 500,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}>Min dashboard</a>
        </div>
      </div>
    </>
  );
}
