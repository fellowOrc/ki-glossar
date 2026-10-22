// Holt das erste JSON-Objekt aus einer Modellantwort. Bevorzugt wird der
// Inhalt eines ```json-Codeblocks, sonst der gesamte Text; jeweils vom ersten
// "{" bis zur letzten "}". Liefert null, wenn nichts Parsebares gefunden wird.
export function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text].filter(
    (c): c is string => typeof c === "string"
  );

  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // nächsten Kandidaten versuchen
    }
  }
  return null;
}
