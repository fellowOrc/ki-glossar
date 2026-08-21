"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

export function SuggestionForm({ vorbelegt }: { vorbelegt?: string }) {
  const [termName, setTermName] = useState(vorbelegt ?? "");
  const [note, setNote] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState(""); // Honigtopf
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vorschlag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termName,
          note,
          contactEmail,
          website,
          startedAt: startedAtRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Der Vorschlag konnte nicht gesendet werden.");
        return;
      }
      setGesendet(true);
    } catch {
      setError(
        "Der Vorschlag konnte nicht gesendet werden. Bitte prüfe deine Verbindung."
      );
    } finally {
      setLoading(false);
    }
  }

  if (gesendet) {
    return (
      <div className="panel p-8">
        <p className="eyebrow mb-2">Danke</p>
        <h2 className="text-xl font-semibold mb-3">Vorschlag ist angekommen</h2>
        <p className="text-muted mb-6">
          Wir sehen ihn uns an. Passt der Begriff ins Glossar, wird er
          recherchiert, geschrieben und veröffentlicht.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setTermName("");
              setNote("");
              setGesendet(false);
              startedAtRef.current = Date.now();
            }}
            className="btn btn-primary"
          >
            Noch einen Begriff vorschlagen
          </button>
          <Link href="/" className="btn btn-secondary">
            Zurück zum Glossar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-6 sm:p-8 flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-medium text-sm">
          Welcher Begriff fehlt? <span className="text-danger">*</span>
        </span>
        <input
          required
          autoFocus
          minLength={2}
          maxLength={120}
          value={termName}
          onChange={(e) => setTermName(e.target.value)}
          placeholder="z. B. Retrieval Augmented Generation"
          className="field"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-sm">
          Anmerkung <span className="text-muted font-normal">(optional)</span>
        </span>
        <textarea
          rows={4}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Wo ist dir der Begriff begegnet? Was daran ist für den Mittelstand wichtig?"
          className="field resize-y"
        />
        <span className="text-xs text-muted">{note.length} / 1000 Zeichen</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-sm">
          E-Mail <span className="text-muted font-normal">(optional)</span>
        </span>
        <input
          type="email"
          maxLength={200}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="nur, falls wir dich benachrichtigen sollen"
          className="field"
        />
        <span className="text-xs text-muted">
          Wird ausschließlich für eine Rückmeldung zu diesem Vorschlag genutzt
          und nicht veröffentlicht.
        </span>
      </label>

      {/* Honigtopf gegen automatisierte Einsendungen. Für Menschen unsichtbar,
          für Bildschirmleser ausgeblendet. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Wird gesendet …" : "Vorschlag absenden"}
        </button>
        <Link href="/" className="btn btn-quiet">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
