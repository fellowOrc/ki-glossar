import type { ProgressEvent } from "@/lib/ai-entwurf/typen";

// Übersetzt die Stream-Ereignisse der Anthropic-API in Phasenmeldungen für
// die Fortschrittsanzeige. Die Prozentwerte sind Schätzungen: Websuchen
// füllen den Balken bis ca. 60 %, das Formulieren bis höchstens 95 %.

type PhaseEvent = Extract<ProgressEvent, { type: "phase" }>;

// Nur die Felder, die hier ausgewertet werden.
export type StreamEreignis =
  | { type: "content_block_start"; content_block: { type: string } }
  | { type: "content_block_delta"; delta: { type: string; text?: string } }
  | { type: string };

export const FORMULIEREN = "Entwurf wird formuliert …";

export function erstelleFortschrittsmelder(senden: (event: PhaseEvent) => void) {
  let searchCount = 0;
  let wroteTextPhase = false;
  let textChars = 0;

  return function verarbeite(event: StreamEreignis) {
    if (event.type === "content_block_start" && "content_block" in event) {
      const block = event.content_block;
      if (block.type === "server_tool_use") {
        searchCount += 1;
        senden({
          type: "phase",
          label:
            searchCount === 1
              ? "Recherchiere Fachquellen im Web …"
              : `Recherchiere Fachquellen im Web (Suche ${searchCount}) …`,
          progress: Math.min(0.15 + searchCount * 0.1, 0.55),
        });
      } else if (block.type === "web_search_tool_result") {
        senden({
          type: "phase",
          label: "Suchergebnisse werden ausgewertet …",
          progress: Math.min(0.2 + searchCount * 0.1, 0.6),
        });
      } else if (block.type === "text" && !wroteTextPhase) {
        wroteTextPhase = true;
        senden({ type: "phase", label: FORMULIEREN, progress: 0.65 });
      }
    } else if (
      event.type === "content_block_delta" &&
      "delta" in event &&
      event.delta.type === "text_delta"
    ) {
      textChars += event.delta.text?.length ?? 0;
      const progress = Math.min(0.65 + textChars / 4000, 0.95);
      // Nur gelegentlich melden, nicht bei jedem Textstück.
      if (textChars % 400 < 24) {
        senden({ type: "phase", label: FORMULIEREN, progress });
      }
    }
  };
}
