"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Suggestion = {
  id: string;
  term_name: string;
  note: string | null;
  contact_email: string | null;
  status: "neu" | "uebernommen" | "abgelehnt";
  created_at: string;
};

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SuggestionList({
  suggestions,
  bereitsVorhanden,
}: {
  suggestions: Suggestion[];
  bereitsVorhanden: Record<string, string>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setzeStatus(
    s: Suggestion,
    status: "uebernommen" | "abgelehnt" | "neu"
  ) {
    setBusyId(s.id);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("suggestions")
      .update({
        status,
        handled_at: status === "neu" ? null : new Date().toISOString(),
      })
      .eq("id", s.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function loeschen(s: Suggestion) {
    setBusyId(s.id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("suggestions")
      .delete()
      .eq("id", s.id);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  if (suggestions.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-muted">
          Aktuell liegen keine offenen Vorschläge vor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {suggestions.map((s) => {
        const busy = busyId === s.id;
        const dublette = bereitsVorhanden[s.term_name.trim().toLowerCase()];

        return (
          <article key={s.id} className="panel p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg leading-snug">
                  {s.term_name}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {formatDatum(s.created_at)}
                  {s.contact_email && (
                    <>
                      {" · "}
                      <a
                        href={`mailto:${s.contact_email}`}
                        className="text-primary hover:underline"
                      >
                        {s.contact_email}
                      </a>
                    </>
                  )}
                </p>
              </div>
              {s.status === "neu" ? (
                <span className="badge bg-accent-soft text-accent-foreground">
                  Neu
                </span>
              ) : s.status === "uebernommen" ? (
                <span className="badge bg-primary-soft text-primary">
                  Übernommen
                </span>
              ) : (
                <span className="badge bg-surface-soft text-muted">
                  Abgelehnt
                </span>
              )}
            </div>

            {dublette && (
              <p className="text-sm text-muted bg-surface-soft rounded-lg px-4 py-3">
                Achtung: Unter diesem Namen gibt es bereits einen Eintrag
                (Status: {dublette}).
              </p>
            )}

            {s.note && (
              <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
                {s.note}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {s.status === "neu" && (
                <>
                  <a
                    href={`/neuer-begriff?begriff=${encodeURIComponent(
                      s.term_name
                    )}&vorschlag=${s.id}`}
                    className="btn btn-primary"
                  >
                    Recherchieren und anlegen
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setzeStatus(s, "abgelehnt")}
                    className="btn btn-secondary"
                  >
                    Ablehnen
                  </button>
                </>
              )}
              {s.status !== "neu" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setzeStatus(s, "neu")}
                  className="btn btn-secondary"
                >
                  Wieder öffnen
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => loeschen(s)}
                className="btn btn-quiet"
              >
                {busy ? "…" : "Löschen"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
