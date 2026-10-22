"use client";

import { useState } from "react";

// Löschen in zwei Schritten: Der erste Klick fragt nach, erst „Ja, löschen“
// löscht wirklich. Schützt vor versehentlichem Datenverlust per Fehlklick.
export function LoeschenMitRueckfrage({
  onLoeschen,
  disabled = false,
  laeuft = false,
  beschriftung = "Löschen",
  frage = "Wirklich unwiderruflich löschen?",
}: {
  onLoeschen: () => void;
  disabled?: boolean;
  // true, solange das Löschen läuft
  laeuft?: boolean;
  beschriftung?: string;
  frage?: string;
}) {
  const [fragt, setFragt] = useState(false);

  if (!fragt) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setFragt(true)}
        className="btn btn-quiet"
      >
        {beschriftung}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-danger">{frage}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onLoeschen}
        className="btn btn-danger"
      >
        {laeuft ? "Lösche …" : "Ja, löschen"}
      </button>
      <button
        type="button"
        disabled={laeuft}
        onClick={() => setFragt(false)}
        className="btn btn-quiet"
      >
        Abbrechen
      </button>
    </span>
  );
}
