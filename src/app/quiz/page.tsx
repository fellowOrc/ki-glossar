import { createClient } from "@/lib/supabase/server";
import { QuizClient, type QuizFrage } from "@/components/quiz-client";

export const metadata = { title: "Teste dein Wissen – KI-Glossar" };
export const dynamic = "force-dynamic";

const FRAGEN_ANZAHL = 10;
const OPTIONEN_ANZAHL = 4;

// Sehr generische Wörter, die trotz Vorkommen im Begriffsnamen NICHT einzeln
// verdeckt werden sollen (sonst würde z. B. "KI" quer durch fast jede
// Beschreibung geschwärzt). Der vollständige Begriffsname wird davon
// unabhängig immer verdeckt.
const STOPWORTE = new Set(["ai", "ki"]);

function shuffle<T>(liste: T[]): T[] {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
function grundformen(begriffsname: string): string[] {
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
function verdeckeAliasKlammern(text: string): string {
  return text.replace(
    /\((auch(?:\s+bekannt\s+als)?|synonym|dt\.?|deutsch|engl\.?|englisch|zu\s+deutsch)\s*:?\s*([^)]+)\)/gi,
    (_match, marker: string) => `(${marker}: ▉▉▉▉▉)`
  );
}

// Ersetzt jede Wortform aus grundformen() im Beschreibungstext durch einen
// Platzhalter. Ein optionales Plural-Suffix (Token→Tokens, Chatbot→Chatbots,
// Agent→Agenten, Modell→Modelle …) sorgt dafür, dass auch gebeugte Formen
// erfasst werden. Sonst würde die Frage den gesuchten Begriff verraten.
function redigiere(text: string, begriffsname: string): string {
  let ergebnis = verdeckeAliasKlammern(text);
  for (const form of grundformen(begriffsname)) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}])${escaped}(?:e|en|n|s)?(?![\\p{L}\\p{N}])`,
      "giu"
    );
    ergebnis = ergebnis.replace(regex, "▉▉▉▉▉");
  }
  return ergebnis;
}

export default async function QuizPage() {
  const supabase = await createClient();
  const { data: terms } = await supabase
    .from("terms")
    .select("id, name, short_explanation, definition")
    .eq("status", "published");

  const pool = (terms ?? []).filter(
    (t) => t.name && (t.short_explanation?.trim() || t.definition?.trim())
  );

  if (pool.length < OPTIONEN_ANZAHL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <p className="eyebrow mb-3">Teste dein Wissen</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Noch nicht genug Begriffe für „Teste dein Wissen“
        </h1>
        <p className="text-muted">
          Dafür braucht es mindestens {OPTIONEN_ANZAHL} veröffentlichte
          Begriffe mit Beschreibung. Aktuell {pool.length === 1 ? "ist" : "sind"} es{" "}
          {pool.length}.
        </p>
      </div>
    );
  }

  const ausgewaehlt = shuffle(pool).slice(
    0,
    Math.min(FRAGEN_ANZAHL, pool.length)
  );

  const fragen: QuizFrage[] = ausgewaehlt.map((term) => {
    const basistext = term.short_explanation?.trim() || term.definition?.trim() || "";
    const beschreibung = redigiere(basistext, term.name);

    const andereNamen = shuffle(
      pool.filter((t) => t.id !== term.id).map((t) => t.name)
    ).slice(0, OPTIONEN_ANZAHL - 1);

    return {
      beschreibung,
      optionen: shuffle([term.name, ...andereNamen]),
      richtigeAntwort: term.name,
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <p className="eyebrow mb-3">Teste dein Wissen</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">
        Wie fit bist du in KI-Begriffen?
      </h1>
      <QuizClient fragen={fragen} />
    </div>
  );
}
