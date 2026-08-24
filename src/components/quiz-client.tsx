"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type QuizFrage = {
  beschreibung: string;
  optionen: string[];
  richtigeAntwort: string;
};

type Schritt = "intro" | "spielt" | "ergebnis";

// Ab diesem Anteil richtiger Antworten wird die jeweilige Einschätzung gezeigt.
// Absteigend sortiert, die erste zutreffende Schwelle gewinnt.
const EINSCHAETZUNGEN: { abAnteil: number; text: string }[] = [
  {
    abAnteil: 1,
    text: "Perfekt getroffen. Du bewegst dich in KI-Begriffen sicher wie in vertrautem Terrain.",
  },
  {
    abAnteil: 0.7,
    text: "Starkes Ergebnis. Die wichtigsten KI-Begriffe sitzen bei dir bereits gut.",
  },
  {
    abAnteil: 0.4,
    text: "Solider Start. Ein Teil der Begriffe ist schon vertraut, der Rest lohnt einen zweiten Blick im Glossar.",
  },
  {
    abAnteil: 0,
    text: "Noch viel zu entdecken. Ein Streifzug durchs Glossar dürfte einige Aha-Momente bringen.",
  },
];

function einschaetzung(anteil: number): string {
  return (
    EINSCHAETZUNGEN.find((e) => anteil >= e.abAnteil)?.text ??
    EINSCHAETZUNGEN[EINSCHAETZUNGEN.length - 1].text
  );
}

export function QuizClient({ fragen }: { fragen: QuizFrage[] }) {
  const router = useRouter();
  const [schritt, setSchritt] = useState<Schritt>("intro");
  const [index, setIndex] = useState(0);
  const [antworten, setAntworten] = useState<(string | null)[]>(
    Array(fragen.length).fill(null)
  );
  const [abbrechenAbfrage, setAbbrechenAbfrage] = useState(false);

  function neuStarten() {
    setSchritt("intro");
    setIndex(0);
    setAntworten(Array(fragen.length).fill(null));
    setAbbrechenAbfrage(false);
    router.refresh();
  }

  function auswaehlen(option: string) {
    setAntworten((prev) => {
      const kopie = [...prev];
      kopie[index] = option;
      return kopie;
    });
  }

  function weiter() {
    if (index === fragen.length - 1) {
      setSchritt("ergebnis");
      return;
    }
    setIndex((i) => i + 1);
  }

  if (schritt === "intro") {
    return (
      <div className="panel p-6 sm:p-8 flex flex-col gap-5">
        <h2 className="eyebrow">Quiz</h2>
        <p className="text-sm text-muted leading-relaxed">
          Du bekommst {fragen.length} Beschreibungen nacheinander gezeigt und
          wählst jeweils aus vier Begriffen den passenden aus. Zwischendurch
          kannst du eine Frage zurückgehen, um deine Antwort zu ändern. Deine
          Auswertung siehst du erst am Ende, welche Fragen falsch waren,
          verrät sie nicht. Du kannst jederzeit abbrechen.
        </p>
        <button
          type="button"
          onClick={() => setSchritt("spielt")}
          className="btn btn-primary self-start"
        >
          Quiz starten
        </button>
      </div>
    );
  }

  if (schritt === "spielt") {
    const frage = fragen[index];
    const gewaehlt = antworten[index];
    const percent = Math.round((index / fragen.length) * 100);

    return (
      <div className="panel p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <p className="eyebrow mb-2">
            Frage {index + 1} von {fragen.length}
          </p>
          <div
            className="h-2 w-full rounded-full bg-surface-soft border border-border overflow-hidden"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fortschritt im Quiz"
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <p className="text-lg leading-relaxed">{frage.beschreibung}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {frage.optionen.map((option) => {
            const aktiv = gewaehlt === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => auswaehlen(option)}
                aria-pressed={aktiv}
                className={aktiv ? "chip chip-active text-left" : "chip text-left"}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            disabled={index === 0}
            className="btn btn-secondary"
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={weiter}
            disabled={!gewaehlt}
            className="btn btn-primary"
          >
            {index === fragen.length - 1 ? "Auswertung anzeigen" : "Weiter"}
          </button>
          <span className="flex-1" />
          {abbrechenAbfrage ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-danger">
                Fortschritt geht verloren. Wirklich abbrechen?
              </span>
              <button
                type="button"
                onClick={neuStarten}
                className="btn btn-danger"
              >
                Ja, abbrechen
              </button>
              <button
                type="button"
                onClick={() => setAbbrechenAbfrage(false)}
                className="btn btn-quiet"
              >
                Weiterspielen
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAbbrechenAbfrage(true)}
              className="btn btn-quiet"
            >
              Quiz abbrechen
            </button>
          )}
        </div>
      </div>
    );
  }

  const richtige = antworten.filter(
    (a, i) => a === fragen[i].richtigeAntwort
  ).length;
  const anteil = fragen.length > 0 ? richtige / fragen.length : 0;

  return (
    <div className="panel p-6 sm:p-8 flex flex-col gap-6">
      <h2 className="eyebrow">Dein Ergebnis</h2>

      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-5xl font-semibold tracking-tight">
          {richtige}
          <span className="text-2xl text-muted"> / {fragen.length}</span>
        </p>
        <p className="text-sm text-muted">richtig beantwortet</p>
      </div>

      <p className="text-base leading-relaxed text-center max-w-md mx-auto">
        {einschaetzung(anteil)}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <button type="button" onClick={neuStarten} className="btn btn-primary">
          Nochmal spielen
        </button>
        <Link href="/" className="btn btn-secondary">
          Zurück zum Glossar
        </Link>
      </div>
    </div>
  );
}
