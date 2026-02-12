import Head from "next/head";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 700, color: "#e2e8f0",
        margin: "0 0 10px", fontFamily: "'DM Sans', sans-serif",
      }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

export default function Anvandarvillkor() {
  return (
    <>
      <Head>
        <title>Anv&auml;ndarvillkor &mdash; Bidragsguiden</title>
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #0f2238 30%, #0a1e1e 60%, #0d1117 100%)",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#e2e8f0",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #38bdf8, #10b981)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: "#0a1628",
                fontFamily: "'Space Mono', monospace",
              }}>B</div>
              <h1 style={{
                fontSize: 18, fontWeight: 700, margin: 0, color: "#e2e8f0",
              }}>Anv&auml;ndarvillkor</h1>
            </div>
            <a href="/" style={{
              fontSize: 13, color: "#64748b", textDecoration: "none",
              padding: "6px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>Tillbaka</a>
          </div>

          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 32 }}>
            Senast uppdaterad: 12 februari 2026
          </p>

          <Section title="1. Om tj&auml;nsten">
            <p style={{ margin: 0 }}>
              Bidragsguiden (&quot;Tj&auml;nsten&quot;) &auml;r en webbaserad AI-driven guide som hj&auml;lper svenska f&ouml;retag
              att hitta relevanta bidrag, st&ouml;d och finansieringsm&ouml;jligheter. Tj&auml;nsten tillhandah&aring;lls
              som den &auml;r (&quot;as is&quot;) och utvecklas l&ouml;pande.
            </p>
          </Section>

          <Section title="2. Anv&auml;ndarkonto">
            <p style={{ margin: "0 0 10px" }}>
              Du kan anv&auml;nda Bidragsguiden utan konto med begr&auml;nsad funktionalitet.
              F&ouml;r att spara bidrag, f&ouml;lja din ans&ouml;kningsprocess och f&aring; fler s&ouml;kningar
              per dag kan du skapa ett konto via Google-inloggning.
            </p>
            <p style={{ margin: 0 }}>
              Du ansvarar f&ouml;r att h&aring;lla dina inloggningsuppgifter s&auml;kra. Vi rekommenderar
              att anv&auml;nda ett starkt l&ouml;senord p&aring; ditt Google-konto och aktivera
              tv&aring;faktorsautentisering.
            </p>
          </Section>

          <Section title="3. AI-resultat och r&aring;dgivning">
            <p style={{ margin: "0 0 10px" }}>
              Bidragsguiden anv&auml;nder artificiell intelligens (AI) f&ouml;r att analysera dina svar
              och f&ouml;resl&aring; relevanta bidrag. Informationen som AI:n ger &auml;r <strong style={{ color: "#cbd5e1" }}>
              v&auml;gledande och inte juridisk eller ekonomisk r&aring;dgivning</strong>.
            </p>
            <p style={{ margin: 0 }}>
              Vi str&auml;var efter att h&aring;lla informationen aktuell och korrekt, men kan inte
              garantera att alla bidragsuppgifter (belopp, deadlines, villkor) &auml;r uppdaterade
              vid varje tidpunkt. Kontrollera alltid direkt hos den ansvariga myndigheten
              innan du ans&ouml;ker om ett bidrag.
            </p>
          </Section>

          <Section title="4. Anv&auml;ndarens ansvar">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}>Anv&auml;nd tj&auml;nsten f&ouml;r dess avsedda syfte (hitta f&ouml;retagsbidrag)</li>
              <li style={{ marginBottom: 6 }}>Ange korrekta uppgifter i quizet f&ouml;r att f&aring; relevanta resultat</li>
              <li style={{ marginBottom: 6 }}>F&ouml;rs&ouml;k inte manipulera, &ouml;verbelasta eller p&aring; annat s&auml;tt missbruka tj&auml;nsten</li>
              <li style={{ marginBottom: 6 }}>Dela inte ditt konto med andra</li>
            </ul>
          </Section>

          <Section title="5. Anv&auml;ndningsbegr&auml;nsningar">
            <p style={{ margin: 0 }}>
              F&ouml;r att s&auml;kerst&auml;lla kvaliteten p&aring; tj&auml;nsten har vi begr&auml;nsningar f&ouml;r antalet
              s&ouml;kningar per dag. Utan konto: 3 s&ouml;kningar/dag. Med konto: 5 s&ouml;kningar/dag.
              Dessa gr&auml;nser kan &auml;ndras utan f&ouml;rvarning.
            </p>
          </Section>

          <Section title="6. Immateriella r&auml;ttigheter">
            <p style={{ margin: 0 }}>
              Allt inneh&aring;ll p&aring; Bidragsguiden (design, kod, texter, logotyp) &auml;r skyddat av
              upphovsr&auml;tt. Du f&aring;r inte kopiera, distribuera eller &aring;terskapa tj&auml;nsten
              eller dess inneh&aring;ll utan skriftligt medgivande. De bidragsresultat du f&aring;r
              &auml;r dock fria att anv&auml;nda f&ouml;r ditt eget f&ouml;retags behov.
            </p>
          </Section>

          <Section title="7. Ansvarsbegr&auml;nsning">
            <p style={{ margin: "0 0 10px" }}>
              Bidragsguiden tillhandah&aring;lls utan garantier av n&aring;got slag. Vi ansvarar inte f&ouml;r:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}>F&ouml;rluster eller skador som uppst&aring;r till f&ouml;ljd av f&ouml;rlitan p&aring; AI-resultat</li>
              <li style={{ marginBottom: 6 }}>Felaktig, ofullst&auml;ndig eller inaktuell bidragsinformation</li>
              <li style={{ marginBottom: 6 }}>Avbrott i tj&auml;nsten eller f&ouml;rlust av data</li>
              <li style={{ marginBottom: 6 }}>Skador som uppst&aring;r genom tredjepartstj&auml;nster (Supabase, Google, Anthropic)</li>
            </ul>
          </Section>

          <Section title="8. Personuppgifter">
            <p style={{ margin: 0 }}>
              Vi behandlar dina personuppgifter i enlighet med v&aring;r{" "}
              <a href="/integritetspolicy" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                integritetspolicy
              </a>. Genom att skapa ett konto samtycker du till behandlingen av dina
              personuppgifter s&aring; som beskrivs d&auml;r.
            </p>
          </Section>

          <Section title="9. &Auml;ndringar av villkoren">
            <p style={{ margin: 0 }}>
              Vi f&ouml;rbeh&aring;ller oss r&auml;tten att &auml;ndra dessa villkor. Vid v&auml;sentliga &auml;ndringar
              meddelas registrerade anv&auml;ndare via e-post eller meddelande i tj&auml;nsten.
              Fortsatt anv&auml;ndning av tj&auml;nsten efter &auml;ndringar inneb&auml;r att du accepterar
              de uppdaterade villkoren.
            </p>
          </Section>

          <Section title="10. Avsluta konto">
            <p style={{ margin: 0 }}>
              Du kan n&auml;r som helst radera ditt konto via din dashboard under F&ouml;retagsprofil.
              N&auml;r du raderar ditt konto tas all din data bort permanent i enlighet med
              v&aring;r integritetspolicy.
            </p>
          </Section>

          <Section title="11. Till&auml;mplig lag och tvist">
            <p style={{ margin: 0 }}>
              Dessa villkor lyder under svensk lag. Eventuella tvister ska i f&ouml;rsta hand
              l&ouml;sas genom dialog. Om en tvist inte kan l&ouml;sas i samf&ouml;rst&aring;nd avg&ouml;rs den
              av svensk allm&auml;n domstol.
            </p>
          </Section>

          <Section title="12. Kontakt">
            <p style={{ margin: 0 }}>
              Har du fr&aring;gor om dessa villkor? Kontakta oss via e-post eller GitHub.
            </p>
          </Section>

          {/* Footer */}
          <div style={{
            marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "#475569",
          }}>
            <a href="/integritetspolicy" style={{ color: "#475569", textDecoration: "none" }}>Integritetspolicy</a>
            <span style={{ color: "#334155" }}>|</span>
            <a href="/" style={{ color: "#475569", textDecoration: "none" }}>Bidragsguiden</a>
          </div>
        </div>
      </div>
    </>
  );
}
