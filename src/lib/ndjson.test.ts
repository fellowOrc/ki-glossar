import { describe, expect, it } from "vitest";
import { leseNdjson } from "@/lib/ndjson";

function streamAus(stuecke: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const s of stuecke) controller.enqueue(encoder.encode(s));
      controller.close();
    },
  });
}

describe("leseNdjson", () => {
  it("setzt über Blockgrenzen geteilte Zeilen zusammen", async () => {
    const gelesen: unknown[] = [];
    const fertig = await leseNdjson(
      streamAus(['{"a":', '1}\n{"b":2}\n\nkaputt\n{"c"', ":3}\n"]),
      (e) => {
        gelesen.push(e);
        return false;
      }
    );
    expect(gelesen).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(fertig).toBe(false);
  });

  it("verwirft eine letzte Zeile ohne Zeilenumbruch", async () => {
    const gelesen: unknown[] = [];
    await leseNdjson(streamAus(['{"a":1}\n{"b":2}']), (e) => {
      gelesen.push(e);
      return false;
    });
    expect(gelesen).toEqual([{ a: 1 }]);
  });

  it("verarbeitet den aktuellen Block zu Ende und liest danach nicht weiter", async () => {
    const gelesen: unknown[] = [];
    const fertig = await leseNdjson(
      streamAus(['{"ende":true}\n{"danach":1}\n', '{"spaeter":1}\n']),
      (e) => {
        gelesen.push(e);
        return (e as { ende?: boolean }).ende === true;
      }
    );
    expect(fertig).toBe(true);
    expect(gelesen).toEqual([{ ende: true }, { danach: 1 }]);
  });
});
