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
