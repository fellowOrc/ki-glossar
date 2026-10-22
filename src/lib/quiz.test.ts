import { describe, expect, it } from "vitest";
import {
  baueQuizFragen,
  grundformen,
  quizTauglich,
  redigiere,
  shuffle,
  type QuizBegriff,
} from "@/lib/quiz";
import goldmaster from "@/lib/__fixtures__/quiz-redaktion.json";

// Die Erwartungswerte in der Fixture wurden mit dem Code erzeugt, der vor dem
// Refactoring in src/app/quiz/page.tsx stand (Golden Master). Sie halten auch
// Eigenheiten fest – etwa dass "Modell" bei "Model" stehen bleibt.
describe("redigiere (Golden Master)", () => {
  for (const fall of goldmaster) {
    it(`verdeckt „${fall.name}“ wie bisher`, () => {
      expect(redigiere(fall.text, fall.name)).toBe(fall.erwartet);
      expect(grundformen(fall.name)).toEqual(fall.formen);
    });
  }
});

// Einfacher, reproduzierbarer Zufallsgenerator für Tests.
function zufallAus(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe("shuffle", () => {
  it("verändert die Eingabe nicht und behält alle Elemente", () => {
    const liste = [1, 2, 3, 4, 5];
    const gemischt = shuffle(liste, zufallAus(1));
    expect(liste).toEqual([1, 2, 3, 4, 5]);
    expect([...gemischt].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

const pool: QuizBegriff[] = Array.from({ length: 12 }, (_, i) => ({
  id: `id-${i}`,
  slug: `begriff-${i}`,
  name: `Begriff${i}`,
  short_explanation: `Begriff${i} ist ein Beispiel.`,
  definition: null,
}));

describe("quizTauglich", () => {
  it("verwirft Begriffe ohne Namen oder ohne Beschreibung", () => {
    const begriffe: QuizBegriff[] = [
      { id: "a", slug: "a", name: "A", short_explanation: "x", definition: null },
      { id: "b", slug: "b", name: "B", short_explanation: "  ", definition: null },
      { id: "c", slug: "c", name: "C", short_explanation: null, definition: "y" },
      { id: "d", slug: "d", name: "", short_explanation: "z", definition: null },
    ];
    expect(quizTauglich(begriffe).map((b) => b.id)).toEqual(["a", "c"]);
  });
});

describe("baueQuizFragen", () => {
  const fragen = baueQuizFragen(pool, 10, 4, zufallAus(42));

  it("liefert höchstens zehn Fragen ohne Wiederholung", () => {
    expect(fragen).toHaveLength(10);
    expect(new Set(fragen.map((f) => f.slug)).size).toBe(10);
  });

  it("enthält je Frage vier verschiedene Optionen inklusive der richtigen", () => {
    for (const frage of fragen) {
      expect(frage.optionen).toHaveLength(4);
      expect(new Set(frage.optionen).size).toBe(4);
      expect(frage.optionen).toContain(frage.richtigeAntwort);
    }
  });

  it("verdeckt den gesuchten Begriff in der Beschreibung", () => {
    for (const frage of fragen) {
      expect(frage.beschreibung).not.toContain(frage.richtigeAntwort);
      expect(frage.beschreibung).toContain("▉▉▉▉▉");
    }
  });

  it("begrenzt die Fragenzahl auf die Größe des Pools", () => {
    expect(baueQuizFragen(pool.slice(0, 5), 10, 4, zufallAus(7))).toHaveLength(5);
  });
});
