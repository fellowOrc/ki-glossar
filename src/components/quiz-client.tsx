"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type QuizFrage = {
  beschreibung: string;
  optionen: string[];
  richtigeAntwort: string;
  slug: string;
};

type Schritt = "intro" | "spielt" | "ergebnis";

// Antwort von /api/quiz-ergebnis: die Einordnung des eigenen Durchlaufs
// gegenüber allen bisher gespeicherten Durchläufen.
type Vergleich = {
  prozent: number;
  durchlaeufe: number;
  durchschnitt: number;
  besserAls: number;
  verteilung: number[];
  eigenerEimer: number;
};

type VergleichStatus =
  | { art: "laedt" }
  | { art: "fertig"; daten: Vergleich }
  | { art: "fehler"; text: string };

// Ab so vielen gespeicherten Durchläufen lohnt sich die Verteilungsgrafik.
// Darunter zeigt sie mehr Zufall als Aussage.
const MINDESTENS_FUER_GRAFIK = 5;

// Ab diesem Prozentsatz richtiger Antworten wird die jeweilige Einschätzung
// gezeigt. Absteigend sortiert, die erste zutreffende Schwelle gewinnt.
const EINSCHAETZUNGEN: { abProzent: number; text: string }[] = [
  {
    abProzent: 90,
    text: "Exzellent! Du bewegst dich in KI-Begriffen wie in vertrautem Terrain. Kaum jemand kennt sich hier so gut aus wie du.",
  },
  {
    abProzent: 80,
    text: "Starkes Ergebnis – die meisten KI-Begriffe sitzen bei dir bereits fest. Nur wenige Feinheiten fehlen dir noch zum Komplettbild.",
  },
  {
    abProzent: 60,
    text: "Du bewegst dich schon recht sicher im KI-Vokabular. Ein zweiter Blick auf die Begriffe, die dir noch unbekannt waren, rundet dein Wissen ab.",
  },
  {
    abProzent: 40,
    text: "Du hast bereits ein solides Grundverständnis der wichtigsten KI-Begriffe. Mit etwas mehr Lektüre schließt du die verbleibenden Lücken schnell.",
  },
  {
    abProzent: 20,
    text: "Ein paar Begriffe sind dir schon vertraut, der Großteil ist aber noch offen. Nimm dir Zeit, dich Begriff für Begriff durchs Glossar zu arbeiten.",
  },
  {
    abProzent: 0,
    text: "Bei KI-Begriffen ist noch vieles Neuland für dich. Ein Blick ins Glossar dürfte gleich mehrere Aha-Momente bringen.",
  },
];

function einschaetzung(prozent: number): string {
  return (
    EINSCHAETZUNGEN.find((e) => prozent >= e.abProzent)?.text ??
    EINSCHAETZUNGEN[EINSCHAETZUNGEN.length - 1].text
  );
}

function durchlaufWort(anzahl: number): string {
  return anzahl === 1 ? "Durchlauf" : "Durchläufe";
}

// Der Satz, um den es geht: über, unter oder genau im Durchschnitt.
function einordnungssatz(daten: Vergleich): string {
  if (daten.prozent > daten.durchschnitt) {
    return `Mit deinem Ergebnis liegst du über dem Durchschnitt aller Quizteilnehmer – der liegt bei ${daten.durchschnitt} %.`;
  }
  if (daten.prozent < daten.durchschnitt) {
    return `Mit deinem Ergebnis liegst du unter dem Durchschnitt aller Quizteilnehmer – der liegt bei ${daten.durchschnitt} %.`;
  }
  return `Mit deinem Ergebnis liegst du genau im Durchschnitt aller Quizteilnehmer (${daten.durchschnitt} %).`;
}

function eimerBeschriftung(index: number): string {
  return index === 9 ? "90–100 %" : `${index * 10}–${index * 10 + 9} %`;
}

// Zehn Balken in Zehnerschritten, der eigene Bereich hervorgehoben. Bewusst
// ohne Diagrammbibliothek: eine Handvoll <div> reicht und bleibt in beiden
// Farbschemata lesbar.
function Verteilung({ daten }: { daten: Vergleich }) {
  const hoechster = Math.max(...daten.verteilung, 1);

  return (
    <figure className="m-0">
      <div
        className="flex items-end gap-1 h-28"
        role="img"
        aria-label={`Verteilung aller ${daten.durchlaeufe} Durchläufe in Zehnerschritten. Dein Ergebnis liegt im Bereich ${eimerBeschriftung(daten.eigenerEimer)}.`}
      >
        {daten.verteilung.map((anzahl, i) => {
          const eigener = i === daten.eigenerEimer;
          const hoehe = Math.max((anzahl / hoechster) * 100, anzahl > 0 ? 6 : 2);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end h-full"
              title={`${eimerBeschriftung(i)}: ${anzahl} ${durchlaufWort(anzahl)}`}
            >
              <div
                className={
                  eigener
                    ? "w-full rounded-t bg-primary"
                    : "w-full rounded-t bg-border-strong"
                }
                style={{ height: `${hoehe}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted mt-2">
        <span>0 %</span>
        <span>50 %</span>
        <span>100 %</span>
      </div>

      <figcaption className="text-xs text-muted mt-2 text-center">
        Verteilung aller {daten.durchlaeufe} {durchlaufWort(daten.durchlaeufe)} –
        dein Bereich ({eimerBeschriftung(daten.eigenerEimer)}) ist
        hervorgehoben.
      </figcaption>
    </figure>
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
  const [vergleich, setVergleich] = useState<VergleichStatus>({ art: "laedt" });

  function neuStarten() {
    setSchritt("intro");
    setIndex(0);
    setAntworten(Array(fragen.length).fill(null));
    setAbbrechenAbfrage(false);
    setVergleich({ art: "laedt" });
    router.refresh();
  }

  function auswaehlen(option: string) {
    setAntworten((prev) => {
      const kopie = [...prev];
      kopie[index] = option;
      return kopie;
    });
  }

  // Wird genau einmal beim Wechsel in die Auswertung aufgerufen – bewusst hier
  // und nicht in einem Effekt, damit der Durchlauf nicht doppelt gezählt wird.
  async function ergebnisMelden(richtige: number) {
    setVergleich({ art: "laedt" });
    try {
      const antwort = await fetch("/api/quiz-ergebnis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ richtige, gesamt: fragen.length }),
      });
      const daten = await antwort.json();
      if (!antwort.ok) {
        setVergleich({
          art: "fehler",
          text:
            typeof daten?.error === "string"
              ? daten.error
              : "Der Vergleich mit allen Teilnehmern ist gerade nicht verfügbar.",
        });
        return;
      }
      setVergleich({ art: "fertig", daten: daten as Vergleich });
    } catch {
      setVergleich({
        art: "fehler",
        text:
          "Der Vergleich mit allen Teilnehmern ist gerade nicht verfügbar. Dein Ergebnis siehst du trotzdem.",
      });
    }
  }

  function weiter() {
    if (index === fragen.length - 1) {
      const antwortenJetzt = antworten;
      const richtige = antwortenJetzt.filter(
        (a, i) => a === fragen[i].richtigeAntwort
      ).length;
      setSchritt("ergebnis");
      void ergebnisMelden(richtige);
      return;
    }
    setIndex((i) => i + 1);
  }

  if (schritt === "intro") {
    return (
      <div className="panel p-6 sm:p-8 flex flex-col gap-5">
        <h2 className="eyebrow">Teste dein Wissen</h2>
        <p className="text-sm text-muted leading-relaxed">
          Du bekommst {fragen.length} Beschreibungen nacheinander gezeigt und
          wählst jeweils aus vier Begriffen den passenden aus. Zwischendurch
          kannst du eine Frage zurückgehen, um deine Antwort zu ändern. Während
          des Quiz verrät dir nichts, ob du richtig lagst – am Ende bekommst du
          alle falsch beantworteten Fragen mit der richtigen Lösung gezeigt und
          siehst, wie du im Vergleich zu allen bisherigen Teilnehmern
          abgeschnitten hast. Du kannst jederzeit abbrechen.
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
  const prozent =
    fragen.length > 0 ? Math.round((richtige / fragen.length) * 100) : 0;

  const falsche = fragen
    .map((frage, i) => ({ frage, nummer: i + 1, gewaehlt: antworten[i] }))
    .filter((e) => e.gewaehlt !== e.frage.richtigeAntwort);

  return (
    <div className="panel p-6 sm:p-8 flex flex-col gap-6">
      <h2 className="eyebrow">Dein Ergebnis</h2>

      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-5xl font-semibold tracking-tight">
          {prozent}
          <span className="text-2xl text-muted">%</span>
        </p>
        <p className="text-sm text-muted">
          {richtige} von {fragen.length} richtig beantwortet
        </p>
      </div>

      <p className="text-base leading-relaxed text-center max-w-md mx-auto">
        {einschaetzung(prozent)}
      </p>

      {/* Einordnung gegenüber allen bisherigen Durchläufen */}
      <section className="border-t border-border pt-6 flex flex-col gap-4">
        <h3 className="eyebrow-muted">Im Vergleich zu allen Teilnehmern</h3>

        {vergleich.art === "laedt" && (
          <p className="text-sm text-muted">Vergleich wird geladen …</p>
        )}

        {vergleich.art === "fehler" && (
          <p className="text-sm text-muted">{vergleich.text}</p>
        )}

        {vergleich.art === "fertig" && (
          <>
            <p className="text-base leading-relaxed">
              {einordnungssatz(vergleich.daten)}
            </p>

            {vergleich.daten.durchlaeufe >= MINDESTENS_FUER_GRAFIK ? (
              <>
                <p className="text-sm text-muted">
                  Damit liegst du vor {vergleich.daten.besserAls} % der bisher{" "}
                  {vergleich.daten.durchlaeufe} gespeicherten Durchläufe.
                </p>
                <Verteilung daten={vergleich.daten} />
              </>
            ) : (
              <p className="text-sm text-muted">
                Bisher {vergleich.daten.durchlaeufe === 1 ? "wurde" : "wurden"}{" "}
                erst {vergleich.daten.durchlaeufe}{" "}
                {durchlaufWort(vergleich.daten.durchlaeufe)} gespeichert – die
                Einordnung wird aussagekräftiger, je mehr Leute mitspielen.
              </p>
            )}
          </>
        )}
      </section>

      {/* Falsch beantwortete Fragen mit der richtigen Lösung */}
      <section className="border-t border-border pt-6 flex flex-col gap-4">
        <h3 className="eyebrow-muted">
          {falsche.length === 0
            ? "Keine Fehler"
            : `Das lag daneben (${falsche.length})`}
        </h3>

        {falsche.length === 0 ? (
          <p className="text-sm text-muted">
            Alle {fragen.length} Fragen richtig beantwortet – da bleibt nichts
            nachzulesen.
          </p>
        ) : (
          <ul className="flex flex-col gap-4 list-none p-0 m-0">
            {falsche.map(({ frage, nummer, gewaehlt }) => (
              <li
                key={nummer}
                className="rounded-lg border border-border bg-surface-soft p-4 flex flex-col gap-3"
              >
                <p className="eyebrow-muted">Frage {nummer}</p>

                <p className="text-sm leading-relaxed">{frage.beschreibung}</p>

                <div className="flex flex-col gap-1 text-sm">
                  <p className="text-danger">
                    <span className="text-muted">Deine Antwort: </span>
                    {gewaehlt ?? "keine Antwort"}
                  </p>
                  <p className="text-ok">
                    <span className="text-muted">Richtig wäre: </span>
                    <strong className="font-semibold">
                      {frage.richtigeAntwort}
                    </strong>
                  </p>
                </div>

                <Link
                  href={`/begriff/${frage.slug}`}
                  className="text-sm font-medium text-primary hover:underline self-start"
                >
                  {frage.richtigeAntwort} im Glossar nachlesen →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
