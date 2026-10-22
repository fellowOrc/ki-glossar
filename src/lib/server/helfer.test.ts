import { describe, expect, it } from "vitest";
import { extractJson } from "@/lib/server/json";
import { ABSENDER_PRAEFIX, hashAbsender } from "@/lib/server/absender";
import { istMengenbegrenzung } from "@/lib/server/datenbank-fehler";
import { textAusAntwort } from "@/lib/server/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

describe("extractJson", () => {
  it("liest einen ```json-Codeblock", () => {
    expect(extractJson('Text\n```json\n{"a": 1}\n```\nmehr')).toEqual({ a: 1 });
  });

  it("liest ein Objekt ohne Codeblock aus dem Fließtext", () => {
    expect(extractJson('Hier: {"a": {"b": 2}} fertig')).toEqual({ a: { b: 2 } });
  });

  it("weicht auf den Gesamttext aus, wenn der Codeblock kaputt ist", () => {
    expect(extractJson('```json\nkaputt\n``` und {"ok": true}')).toEqual({
      ok: true,
    });
  });

  it("liefert null ohne parsebares Objekt", () => {
    expect(extractJson("kein JSON")).toBeNull();
    expect(extractJson("{ kaputt ")).toBeNull();
    expect(extractJson("} {")).toBeNull();
  });
});

function anfrage(headers: Record<string, string>) {
  return new Request("https://example.org", { headers });
}

describe("hashAbsender", () => {
  // Referenzwerte stammen aus der Implementierung vor dem Refactoring. Ändern
  // sie sich, greift die Mengenbegrenzung für bestehende Einträge nicht mehr.
  it("erzeugt dieselben Hashes wie bisher", () => {
    const r = anfrage({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(hashAbsender(r, ABSENDER_PRAEFIX.vorschlag)).toBe(
      "ddb0d45ead4d5a521fe6eb5a6814ade6"
    );
    expect(hashAbsender(r, ABSENDER_PRAEFIX.quiz)).toBe(
      "cb3853c641cbf3adec182ac4bb3de286"
    );
  });

  it("nutzt x-real-ip, wenn x-forwarded-for fehlt", () => {
    expect(
      hashAbsender(anfrage({ "x-real-ip": " 203.0.113.7 " }), "ki-glossar")
    ).toBe("ddb0d45ead4d5a521fe6eb5a6814ade6");
  });

  it("liefert null ohne IP-Angabe", () => {
    expect(hashAbsender(anfrage({}), "ki-glossar")).toBeNull();
  });
});

describe("istMengenbegrenzung", () => {
  it("erkennt Code 23514 und die Trigger-Meldung", () => {
    expect(istMengenbegrenzung({ code: "23514", message: "" })).toBe(true);
    expect(istMengenbegrenzung({ message: "Zu viele Vorschläge" })).toBe(true);
    expect(istMengenbegrenzung({ code: "42501", message: "denied" })).toBe(false);
  });
});

describe("textAusAntwort", () => {
  it("verbindet nur Textblöcke", () => {
    const content = [
      { type: "text", text: "a", citations: null },
      { type: "server_tool_use", id: "x", name: "web_search", input: {} },
      { type: "text", text: "b", citations: null },
    ] as unknown as Anthropic.ContentBlock[];
    expect(textAusAntwort(content)).toBe("a\nb");
  });
});
