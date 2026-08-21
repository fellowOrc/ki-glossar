"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TermFields, type TermDraft } from "@/components/term-fields";
import type { Category, Term, TermStatus } from "@/types/database";

export function TermEditForm({
  termId,
  ursprungsSlug,
  status,
  start,
  categories,
  existingTerms,
}: {
  termId: string;
  ursprungsSlug: string;
  status: TermStatus;
  start: TermDraft;
  categories: Category[];
  existingTerms: Pick<Term, "id" | "slug" | "name">[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<TermDraft>(start);
  const [slugTouched, setSlugTouched] = useState(true);
  const [busy, setBusy] = useState<null | "speichern" | "status" | "loeschen">(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [loeschAbfrage, setLoeschAbfrage] = useState(false);

  function updateDraft(patch: Partial<TermDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setHinweis(null);
  }

  async function speichern(neuerStatus?: TermStatus) {
    if (!draft.name.trim() || !draft.slug.trim()) {
      setError("Begriff und URL-Slug sind erforderlich.");
      return;
    }

    setBusy(neuerStatus ? "status" : "speichern");
    setError(null);
    setHinweis(null);

    const supabase = createClient();

    const { error: termError } = await supabase
      .from("terms")
      .update({
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        category_id: draft.categoryId || null,
        short_explanation: draft.shortExplanation.trim() || null,
        definition: draft.definition.trim() || null,
        business_relevance: draft.businessRelevance.trim() || null,
        ...(neuerStatus ? { status: neuerStatus } : {}),
      })
      .eq("id", termId);

    if (termError) {
      setError(
        termError.message.includes("duplicate")
          ? "Ein anderer Begriff nutzt diesen Slug bereits."
          : termError.message
      );
      setBusy(null);
      return;
    }

    await supabase.from("sources").delete().eq("term_id", termId);
    const gueltigeQuellen = draft.sources.filter((s) => s.title.trim());
    if (gueltigeQuellen.length > 0) {
      const { error: quellenFehler } = await supabase.from("sources").insert(
        gueltigeQuellen.map((s) => ({
          term_id: termId,
          title: s.title.trim(),
          authors: s.authors.trim() || null,
          publisher: s.publisher.trim() || null,
          year: s.year ? parseInt(s.year, 10) : null,
          url: s.url.trim() || null,
        }))
      );
      if (quellenFehler) {
        setError(`Quellen konnten nicht gespeichert werden: ${quellenFehler.message}`);
        setBusy(null);
        return;
      }
    }

    await supabase.from("term_relations").delete().eq("term_id", termId);
    await supabase.from("term_relations").delete().eq("related_term_id", termId);
    if (draft.relatedIds.length > 0) {
      await supabase.from("term_relations").insert(
        draft.relatedIds.flatMap((id) => [
          { term_id: termId, related_term_id: id },
          { term_id: id, related_term_id: termId },
        ])
      );
    }

    setBusy(null);

    if (draft.slug.trim() !== ursprungsSlug) {
      router.replace(`/begriff/${draft.slug.trim()}/bearbeiten`);
    }
    router.refresh();
    setHinweis(
      neuerStatus === "published"
        ? "Gespeichert und veröffentlicht."
        : neuerStatus === "draft"
          ? "Gespeichert und aus der Veröffentlichung zurückgezogen."
          : "Änderungen gespeichert."
    );
  }

  async function loeschen() {
    setBusy("loeschen");
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("terms")
      .delete()
      .eq("id", termId);
    if (deleteError) {
      setError(deleteError.message);
      setBusy(null);
      return;
    }
    router.push("/redaktion");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Status:{" "}
            {status === "published" ? (
              <span className="font-semibold text-foreground">
                veröffentlicht
              </span>
            ) : (
              <span className="font-semibold text-foreground">Entwurf</span>
            )}
          </p>
          {status === "published" && (
            <Link
              href={`/begriff/${ursprungsSlug}`}
              className="text-sm text-primary hover:underline"
            >
              Öffentliche Ansicht ansehen
            </Link>
          )}
        </div>
        {status === "published" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => speichern("draft")}
            className="btn btn-secondary"
          >
            Speichern und zurückziehen
          </button>
        ) : (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => speichern("published")}
            className="btn btn-primary"
          >
            Speichern und veröffentlichen
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          speichern();
        }}
        className="flex flex-col gap-6"
      >
        <TermFields
          draft={draft}
          onChange={updateDraft}
          categories={categories}
          existingTerms={existingTerms.filter((t) => t.id !== termId)}
          slugTouched={slugTouched}
          onSlugTouched={() => setSlugTouched(true)}
        />

        {error && (
          <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
        {hinweis && (
          <p className="text-sm text-primary bg-primary-soft border border-primary/30 rounded-lg px-4 py-3">
            {hinweis}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy !== null}
            className="btn btn-primary"
          >
            {busy === "speichern" ? "Speichere …" : "Änderungen speichern"}
          </button>
          <Link href="/redaktion" className="btn btn-secondary">
            Zur Redaktion
          </Link>
          <span className="flex-1" />
          {loeschAbfrage ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-danger">
                Wirklich unwiderruflich löschen?
              </span>
              <button
                type="button"
                disabled={busy !== null}
                onClick={loeschen}
                className="btn btn-danger"
              >
                {busy === "loeschen" ? "Lösche …" : "Ja, löschen"}
              </button>
              <button
                type="button"
                onClick={() => setLoeschAbfrage(false)}
                className="btn btn-quiet"
              >
                Abbrechen
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setLoeschAbfrage(true)}
              className="btn btn-quiet"
            >
              Begriff löschen
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
