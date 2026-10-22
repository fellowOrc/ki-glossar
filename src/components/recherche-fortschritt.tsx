// Anzeige während der KI-Recherche (Schritt 2 von 3 beim Anlegen).
export function RechercheFortschritt({
  begriff,
  phase,
  fortschritt,
  onAbbrechen,
}: {
  begriff: string;
  phase: string;
  fortschritt: number;
  onAbbrechen: () => void;
}) {
  const percent = Math.round(fortschritt * 100);
  return (
    <div className="panel p-6 flex flex-col gap-5">
      <h2 className="eyebrow">Schritt 2 von 3 · Recherche läuft</h2>

      <div>
        <p className="font-semibold mb-1">{begriff}</p>
        <p className="text-sm text-muted" aria-live="polite">
          {phase}
        </p>
      </div>

      <div>
        <div
          className="h-2.5 w-full rounded-full bg-surface-soft border border-border overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fortschritt der KI-Recherche"
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-muted mt-2">{percent} %</p>
      </div>

      <p className="text-sm text-muted">
        Die Websuche dauert je nach Begriff etwa 30 bis 60 Sekunden. Solange
        die Recherche läuft, wirst du nicht automatisch abgemeldet.
      </p>

      <button
        type="button"
        onClick={onAbbrechen}
        className="btn btn-quiet self-start"
      >
        Abbrechen
      </button>
    </div>
  );
}
