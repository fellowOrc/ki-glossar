"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ReviewTerm = {
  id: string;
  name: string;
  slug: string;
  short_explanation: string | null;
  definition: string | null;
  business_relevance: string | null;
  created_at: string;
  created_by: string | null;
  moderation_status: "unchecked" | "ok" | "flagged";
  moderation_notes: string | null;
  moderation_checked_at: string | null;
  category: { name: string } | null;
};

function StatusBadge({ status }: { status: ReviewTerm["moderation_status"] }) {
  if (status === "unchecked") {
    return (
      <span className="badge bg-surface-soft text-muted">Ungeprüft</span>
    );
  }
  if (status === "flagged") {
    return <span className="badge bg-danger-soft text-danger">Auffällig</span>;
  }
  return <span className="badge bg-primary-soft text-primary">Geprüft</span>;
}

export function ReviewList({
  terms,
  authorEmails,
}: {
  terms: ReviewTerm[];
  authorEmails: Record<string, string>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheck(term: ReviewTerm) {
    setBusyId(term.id);
    setError(null);
    try {
      const res = await fetch("/api/pruefung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId: term.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prüfung fehlgeschlagen.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prüfung fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  async function publish(term: ReviewTerm) {
    setBusyId(term.id);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("terms")
      .update({ status: "published" })
      .eq("id", term.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function remove(term: ReviewTerm) {
    setBusyId(term.id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("terms")
      .delete()
      .eq("id", term.id);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {terms.map((term) => {
        const busy = busyId === term.id;
        return (
          <article key={term.id} className="panel p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg leading-snug">
                  {term.name}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {term.category?.name ?? "ohne Kategorie"}
                  {" · "}
                  {term.created_by
                    ? (authorEmails[term.created_by] ?? "unbekannt")
                    : "unbekannt"}
                  {" · "}
                  {new Date(term.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
              <StatusBadge status={term.moderation_status} />
            </div>

            {term.short_explanation && (
              <p className="text-sm text-muted leading-relaxed">
                {term.short_explanation}
              </p>
            )}

            {term.moderation_notes ? (
              <div
                className={`text-sm rounded-lg px-4 py-3 ${
                  term.moderation_status === "flagged"
                    ? "bg-danger-soft text-danger"
                    : "bg-surface-soft text-muted"
                }`}
              >
                <p className="font-semibold text-xs mb-1 uppercase tracking-wide">
                  Automatische Einschätzung
                </p>
                <p className="leading-relaxed">{term.moderation_notes}</p>
              </div>
            ) : (
              <p className="text-sm text-muted italic">
                Noch keine automatische Einschätzung vorhanden.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => publish(term)}
                className="btn btn-primary"
              >
                Veröffentlichen
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runCheck(term)}
                className="btn btn-secondary"
              >
                {busy ? "…" : "Automatisch prüfen"}
              </button>
              <Link
                href={`/begriff/${term.slug}/bearbeiten`}
                className="btn btn-secondary"
              >
                Prüfen und bearbeiten
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(term)}
                className="btn btn-quiet"
              >
                Löschen
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
