import type Anthropic from "@anthropic-ai/sdk";

// Ein Ort für das verwendete Modell, damit ein Modellwechsel nur hier
// passiert und nicht in jeder Route einzeln.
export const KI_MODELL = "claude-sonnet-4-5";

// Fügt alle Textblöcke einer Modellantwort zusammen.
export function textAusAntwort(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
