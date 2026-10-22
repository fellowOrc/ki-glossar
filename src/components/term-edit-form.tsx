"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TermFields } from "@/components/term-fields";
import { Hinweis } from "@/components/hinweis";
import { LoeschenMitRueckfrage } from "@/components/loeschen-mit-rueckfrage";
import {
  istDoppelterSlug,
  istSpeicherbar,
  speicherParameter,
  type TermDraft,
} from "@/lib/term-draft";
import type { Category, TermRef, TermStatus } from "@/types/database";

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
  existingTerms: TermRef[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<TermDraft>(start);
  const [slugTouched, setSlugTouched] = useState(true);
  const [busy, setBusy] = useState<null | "speichern" | "status" | "loeschen">(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  function updateDraft(patch: Partial<TermDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setHinweis(null);
  }

  async function speichern(neuerStatus?: TermStatus) {
    if (!istSpeicherbar(draft)) {
      setError("Begriff und URL-Slug sind erforderlich.");
      return;
    }

    setBusy(neuerStatus ? "status" : "speichern");
    setError(null);
    setHinweis(null);

    const supabase = createClient();

    // Begriff, Quellen und Verknüpfungen in einer Transaktion: Scheitert ein
    // Teil, bleibt der gespeicherte Stand vollständig erhalten.
    const { error: speicherFehler } = await supabase.rpc(
      "begriff_speichern",
      speicherParameter(draft, { termId, status: neuerStatus ?? null })
    );

    if (speicherFehler) {
      setError(
        istDoppelterSlug(speicherFehler)
          ? "Ein anderer Begriff nutzt diesen Slug bereits."
          : `Nichts gespeichert: ${speicherFehler.message}`
      );
      setBusy(null);
      return;
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
          <Hinweis>{error}</Hinweis>
        )}
        {hinweis && (
          <Hinweis art="erfolg">{hinweis}</Hinweis>
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
          <LoeschenMitRueckfrage
            disabled={busy !== null}
            laeuft={busy === "loeschen"}
            beschriftung="Begriff löschen"
            onLoeschen={loeschen}
          />
        </div>
      </form>
    </div>
  );
}
