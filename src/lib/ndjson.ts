// Liest einen NDJSON-Stream (ein JSON-Objekt pro Zeile) und reicht jedes
// Objekt an `beiEreignis` weiter. Gibt der Handler true zurück, gilt der
// Stream als abgeschlossen: Die Zeilen des aktuellen Blocks werden noch zu
// Ende verarbeitet, danach wird nicht weitergelesen. Leere und nicht
// parsebare Zeilen werden übersprungen, eine unvollständige letzte Zeile ohne
// Zeilenumbruch verworfen.
//
// Rückgabe: true, wenn der Handler den Abschluss gemeldet hat; false, wenn
// der Stream vorher endete.
export async function leseNdjson(
  body: ReadableStream<Uint8Array>,
  beiEreignis: (ereignis: unknown) => boolean
): Promise<boolean> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let ereignis: unknown;
      try {
        ereignis = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (beiEreignis(ereignis)) finished = true;
    }
  }

  return finished;
}
