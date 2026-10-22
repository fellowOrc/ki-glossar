// Datum als TT.MM.JJJJ (de-DE), z. B. für Listen in der Redaktion.
export function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
