// Reine Quiz-Logik ohne Datenbank und ohne React: Fragen zusammenstellen und
// den gesuchten Begriff in der Beschreibung verdecken. Liegt hier statt in
// der Seite, damit sie sich testen lässt.

export type QuizFrage = {
  beschreibung: string;
  optionen: string[];
  richtigeAntwort: string;
  slug: string;
};

export type QuizBegriff = {
  id: string;
  slug: string;
  name: string;
  short_explanation: string | null;
  definition: string | null;
};

export const FRAGEN_ANZAHL = 10;
export const OPTIONEN_ANZAHL = 4;

// Platzhalter für verdeckte Wörter.
const VERDECKT = "▉▉▉▉▉";

// Sehr generische Wörter, die trotz Vorkommen im Begriffsnamen NICHT einzeln
// verdeckt werden sollen (sonst würde z. B. "KI" quer durch fast jede
// Beschreibung geschwärzt). Der vollständige Begriffsname wird davon
// unabhängig immer verdeckt.
const STOPWORTE = new Set(["ai", "ki"]);

// Fisher-Yates. Der Zufallsgenerator ist austauschbar, damit Tests
// reproduzierbar sind; im Betrieb ist es Math.random.
export function shuffle<T>(liste: T[], zufall: () => number = Math.random): T[] {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// Ermittelt alle Wortformen, die im Beschreibungstext verdeckt werden müssen:
// den vollständigen Begriffsnamen, eine eventuelle Kurzform in Klammern
// (z. B. "Forward Deployed Engineer (FDE)") sowie – bei mehrteiligen
// Begriffen – jedes einzelne (nicht zu generische) Wort davon. Letzteres
// verhindert, dass z. B. bei "Hard Skill" nur "Skill" verdeckt wird, während
// Beschreibungen, die die Wörter einzeln verwenden, den Begriff verraten.
export function grundformen(begriffsname: string): string[] {
  const formen = new Set<string>();

  const ohneKlammer = begriffsname.replace(/\s*\([^)]*\)\s*/g, "").trim();
  const klammerInhalt = begriffsname.match(/\(([^)]+)\)/)?.[1]?.trim();
  const ganzeBegriffe = [ohneKlammer, klammerInhalt, begriffsname.trim()].filter(
    (t): t is string => Boolean(t)
  );

  for (const begriff of ganzeBegriffe) {
    formen.add(begriff);
    const woerter = begriff.split(/[\s-]+/).filter(Boolean);
    if (woerter.length > 1) {
      for (const wort of woerter) {
        if (wort.length > 2 && !STOPWORTE.has(wort.toLowerCase())) {
          formen.add(wort);
        }
      }
    }
  }

  return [...formen];
}

// Manche Beschreibungen erklären den Begriff zusätzlich mit einer
// Übersetzung oder einem Synonym in Klammern, z. B. "Reinforcement Learning
// (auch: Bestärkendes Lernen) …" oder "Deepfake (engl. für tiefgehende
// Fälschung) …". Diese Klammerinhalte verraten die Antwort, obwohl sie
// textlich nichts mit dem Begriffsnamen gemeinsam haben und daher von
// grundformen() gar nicht erfasst werden können. Deshalb wird der Inhalt
// hinter solchen Markern grundsätzlich verdeckt, unabhängig vom Begriff.
export function verdeckeAliasKlammern(text: string): string {
  return text.replace(
    /\((auch(?:\s+bekannt\s+als)?|synonym|dt\.?|deutsch|engl\.?|englisch|zu\s+deutsch)\s*:?\s*([^)]+)\)/gi,
    (_match, marker: string) => `(${marker}: ${VERDECKT})`
  );
}

// Ersetzt jede Wortform aus grundformen() im Beschreibungstext durch einen
// Platzhalter. Ein optionales Plural-Suffix (Token→Tokens, Chatbot→Chatbots,
// Agent→Agenten, Modell→Modelle …) sorgt dafür, dass auch gebeugte Formen
// erfasst werden. Sonst würde die Frage den gesuchten Begriff verraten.
export function redigiere(text: string, begriffsname: string): string {
  let ergebnis = verdeckeAliasKlammern(text);
  for (const form of grundformen(begriffsname)) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}])${escaped}(?:e|en|n|s)?(?![\\p{L}\\p{N}])`,
      "giu"
    );
    ergebnis = ergebnis.replace(regex, VERDECKT);
  }
  return ergebnis;
}

// Nur Begriffe mit Namen und mindestens einem Beschreibungstext taugen als
// Frage oder als Antwortmöglichkeit.
export function quizTauglich<T extends QuizBegriff>(begriffe: T[]): T[] {
  return begriffe.filter(
    (t) => t.name && (t.short_explanation?.trim() || t.definition?.trim())
  );
}

// Wählt zufällig bis zu `anzahlFragen` Begriffe aus dem Pool und baut je
// Frage eine verdeckte Beschreibung plus Antwortmöglichkeiten (richtige
// Antwort und zufällige andere Begriffsnamen) in zufälliger Reihenfolge.
export function baueQuizFragen(
  pool: QuizBegriff[],
  anzahlFragen: number = FRAGEN_ANZAHL,
  anzahlOptionen: number = OPTIONEN_ANZAHL,
  zufall: () => number = Math.random
): QuizFrage[] {
  const ausgewaehlt = shuffle(pool, zufall).slice(
    0,
    Math.min(anzahlFragen, pool.length)
  );

  return ausgewaehlt.map((term) => {
    const basistext =
      term.short_explanation?.trim() || term.definition?.trim() || "";
    const beschreibung = redigiere(basistext, term.name);

    const andereNamen = shuffle(
      pool.filter((t) => t.id !== term.id).map((t) => t.name),
      zufall
    ).slice(0, anzahlOptionen - 1);

    return {
      beschreibung,
      optionen: shuffle([term.name, ...andereNamen], zufall),
      richtigeAntwort: term.name,
      // Für die Auswertung: von jeder falsch beantworteten Frage führt ein
      // Link direkt zum passenden Glossareintrag.
      slug: term.slug,
    };
  });
}
