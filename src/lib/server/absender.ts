import { createHash } from "node:crypto";

// Pseudonymisierter Absender für die Mengenbegrenzung: Hash aus der IP und
// einem Zweck-Präfix, gekürzt auf 32 Zeichen. Die IP selbst wird nie
// gespeichert. Das Präfix trennt die Zwecke, damit sich Einträge aus
// verschiedenen Tabellen nicht miteinander verknüpfen lassen.
export const ABSENDER_PRAEFIX = {
  vorschlag: "ki-glossar",
  quiz: "ki-glossar-quiz",
} as const;

export function hashAbsender(request: Request, praefix: string): string | null {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim();
  if (!forwarded) return null;
  return createHash("sha256")
    .update(`${praefix}:${forwarded}`)
    .digest("hex")
    .slice(0, 32);
}
