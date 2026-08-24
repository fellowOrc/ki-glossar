import { createClient } from "@/lib/supabase/server";
import { QuizClient, type QuizFrage } from "@/components/quiz-client";

export const metadata = { title: "Quiz – KI-Glossar" };
export const dynamic = "force-dynamic";

const FRAGEN_ANZAHL = 10;
const OPTIONEN_ANZAHL = 4;

function shuffle<T>(liste: T[]): T[] {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// Ersetzt den Begriffsnamen (und eine eventuelle Kurzform in Klammern, z. B.
// "Forward Deployed Engineer (FDE)") im Beschreibungstext durch einen
// Platzhalter. Sonst würde die Frage den gesuchten Begriff selbst verraten.
function redigiere(text: string, begriffsname: string): string {
  const teile = new Set<string>();
  const ohneKlammer = begriffsname.replace(/\s*\([^)]*\)\s*/g, "").trim();
  if (ohneKlammer) teile.add(ohneKlammer);
  const klammerInhalt = begriffsname.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (klammerInhalt) teile.add(klammerInhalt);
  teile.add(begriffsname.trim());

  let ergebnis = text;
  for (const teil of teile) {
    if (!teil) continue;
    const escaped = teil.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
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
        <p className="eyebrow mb-3">Quiz</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Noch nicht genug Begriffe fürs Quiz
        </h1>
        <p className="text-muted">
          Für ein Quiz braucht es mindestens {OPTIONEN_ANZAHL} veröffentlichte
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
      <p className="eyebrow mb-3">Quiz</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">
        Wie fit bist du in KI-Begriffen?
      </h1>
      <QuizClient fragen={fragen} />
    </div>
  );
}
