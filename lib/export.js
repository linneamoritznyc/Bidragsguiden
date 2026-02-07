export function resultToText(result, answers) {
  if (!result?.benefits) return "";

  const lines = [];
  lines.push("BIDRAGSGUIDEN — Din personliga bidragsrapport");
  lines.push("=".repeat(50));
  lines.push("");
  lines.push(`Datum: ${new Date().toLocaleDateString("sv-SE")}`);
  lines.push("");

  if (result.summary) {
    lines.push("SAMMANFATTNING");
    lines.push("-".repeat(30));
    lines.push(result.summary);
    if (result.total_potential) {
      lines.push(`Potentiellt sökbart: ${result.total_potential}`);
    }
    lines.push("");
  }

  lines.push(`HITTADE BIDRAG OCH STÖD (${result.benefits.length} st)`);
  lines.push("=".repeat(50));

  result.benefits.forEach((b, i) => {
    lines.push("");
    lines.push(`${i + 1}. ${b.name}`);
    lines.push(`   Myndighet: ${b.agency}`);
    lines.push(`   ${b.description}`);
    if (b.amount) lines.push(`   Belopp: ${b.amount}`);
    if (b.deadline) lines.push(`   Deadline: ${b.deadline}`);
    if (b.eligibility_summary) lines.push(`   Vem kan söka: ${b.eligibility_summary}`);
    if (b.required_docs) lines.push(`   Dokument: ${b.required_docs}`);
    if (b.how_to_apply) lines.push(`   Ansökan: ${b.how_to_apply}`);
    if (b.url) lines.push(`   Länk: ${b.url}`);
    lines.push(`   Prioritet: ${b.priority === "high" ? "Hög" : b.priority === "medium" ? "Medium" : "Låg"}`);
  });

  lines.push("");
  lines.push("-".repeat(50));
  lines.push("OBS: Informationen är vägledande. Kontakta respektive");
  lines.push("myndighet för exakta villkor och aktuella belopp.");
  lines.push("");
  lines.push("Genererad av Bidragsguiden — bidragsguiden.se");

  return lines.join("\n");
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

export function downloadAsFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `bidragsguiden-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsPDF(result, answers) {
  if (!result?.benefits) return;

  const date = new Date().toLocaleDateString("sv-SE");

  const benefitsHTML = result.benefits.map((b, i) => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <h3 style="margin:0;font-size:15px;color:#1a202c;">${i + 1}. ${b.name}</h3>
        <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${b.priority === "high" ? "#dcfce7" : b.priority === "medium" ? "#dbeafe" : "#f1f5f9"};color:${b.priority === "high" ? "#166534" : b.priority === "medium" ? "#1e40af" : "#475569"};">${b.priority === "high" ? "Hög" : b.priority === "medium" ? "Medium" : "Låg"}</span>
      </div>
      <p style="margin:0 0 6px;font-size:12px;color:#3b82f6;font-weight:500;">${b.agency}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.5;">${b.description}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        ${b.amount ? `<div style="padding:6px 10px;border-radius:6px;background:#f0fdf4;font-size:12px;"><span style="color:#6b7280;">Belopp:</span> <strong style="color:#166534;">${b.amount}</strong></div>` : ""}
        ${b.deadline ? `<div style="padding:6px 10px;border-radius:6px;background:#fffbeb;font-size:12px;"><span style="color:#6b7280;">Deadline:</span> <strong style="color:#92400e;">${b.deadline}</strong></div>` : ""}
      </div>
      ${b.eligibility_summary ? `<p style="margin:0 0 4px;font-size:12px;color:#6b7280;line-height:1.4;"><strong>Vem kan söka:</strong> ${b.eligibility_summary}</p>` : ""}
      ${b.how_to_apply ? `<p style="margin:0 0 4px;font-size:12px;color:#6b7280;line-height:1.4;"><strong>Ansökan:</strong> ${b.how_to_apply}</p>` : ""}
      ${b.url ? `<p style="margin:0;font-size:12px;"><a href="${b.url}" style="color:#3b82f6;">${b.url}</a></p>` : ""}
    </div>
  `).join("");

  const recommendationsHTML = result.recommendations?.length ? `
    <div style="border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:20px;background:#fffbeb;">
      <h2 style="margin:0 0 10px;font-size:15px;color:#92400e;">Rekommendationer och nästa steg</h2>
      <ol style="margin:0;padding-left:20px;">
        ${result.recommendations.map(r => `<li style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:4px;">${r}</li>`).join("")}
      </ol>
    </div>
  ` : "";

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>Bidragsguiden - Rapport ${date}</title>
<style>
  @media print {
    body { margin: 0; padding: 20px; }
    .no-print { display: none !important; }
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a202c; max-width: 800px; margin: 0 auto; padding: 24px; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
    <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a;">Bidragsguiden</h1>
    <p style="margin:0;font-size:13px;color:#6b7280;">Din personliga bidragsrapport &mdash; ${date}</p>
  </div>

  ${result.summary ? `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
    <h2 style="margin:0 0 6px;font-size:15px;color:#166534;">Sammanfattning</h2>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${result.summary}</p>
    ${result.total_potential ? `<p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#166534;">Potentiellt sökbart: ${result.total_potential}</p>` : ""}
  </div>
  ` : ""}

  <h2 style="font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
    ${result.benefits.length} bidrag och stöd hittade
  </h2>

  ${benefitsHTML}

  ${recommendationsHTML}

  <div style="margin-top:24px;padding:12px 16px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;color:#6b7280;text-align:center;line-height:1.5;">
    Informationen är vägledande och baseras på AI-analys. Kontakta respektive myndighet för exakta villkor och aktuella belopp.
    Bidragslandskapet förändras — kontrollera alltid att utlysningen är öppen.
  </div>

  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px;">Genererad av Bidragsguiden</p>

  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // Popup blocked — fallback to download
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidragsguiden-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
