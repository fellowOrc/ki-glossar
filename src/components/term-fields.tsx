"use client";

import { useMemo, useState } from "react";
import { slugify } from "@/lib/slugify";
import type { Category, Term } from "@/types/database";

export type SourceRow = {
  title: string;
  authors: string;
  publisher: string;
  year: string;
  url: string;
};

export type TermDraft = {
  name: string;
  slug: string;
  categoryId: string;
  shortExplanation: string;
  definition: string;
  businessRelevance: string;
  sources: SourceRow[];
  relatedIds: string[];
};

export const emptySource: SourceRow = {
  title: "",
  authors: "",
  publisher: "",
  year: "",
  url: "",
};

export function leererEntwurf(categories: Category[], name = ""): TermDraft {
  return {
    name,
    slug: slugify(name),
    categoryId: categories[0]?.id ?? "",
    shortExplanation: "",
    definition: "",
    businessRelevance: "",
    sources: [{ ...emptySource }],
    relatedIds: [],
  };
}

// Alle Eingabefelder eines Eintrags an einer Stelle. Wird beim Anlegen und
// beim Bearbeiten verwendet, damit beide Wege dieselben Felder anbieten.
export function TermFields({
  draft,
  onChange,
  categories,
  existingTerms,
  slugTouched,
  onSlugTouched,
}: {
  draft: TermDraft;
  onChange: (patch: Partial<TermDraft>) => void;
  categories: Category[];
  existingTerms: Pick<Term, "id" | "slug" | "name">[];
  slugTouched: boolean;
  onSlugTouched: () => void;
}) {
  const [relatedFilter, setRelatedFilter] = useState("");

  const gefilterteBegriffe = useMemo(() => {
    const q = relatedFilter.trim().toLowerCase();
    if (!q) return existingTerms;
    return existingTerms.filter((t) => t.name.toLowerCase().includes(q));
  }, [existingTerms, relatedFilter]);

  const ausgewaehlte = useMemo(
    () => existingTerms.filter((t) => draft.relatedIds.includes(t.id)),
    [existingTerms, draft.relatedIds]
  );

  function updateSource(index: number, patch: Partial<SourceRow>) {
    onChange({
      sources: draft.sources.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    });
  }

  return (
    <>
      <section className="panel p-6 flex flex-col gap-4">
        <h2 className="eyebrow">Grunddaten</h2>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">Begriff *</span>
          <input
            required
            value={draft.name}
            onChange={(e) => {
              const value = e.target.value;
              onChange(
                slugTouched
                  ? { name: value }
                  : { name: value, slug: slugify(value) }
              );
            }}
            className="field"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">URL-Slug *</span>
          <input
            required
            value={draft.slug}
            onChange={(e) => {
              onSlugTouched();
              onChange({ slug: slugify(e.target.value) });
            }}
            className="field font-mono text-sm"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">Kategorie</span>
          <select
            value={draft.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            className="field"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel p-6 flex flex-col gap-4">
        <h2 className="eyebrow">Inhalt</h2>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">Kurzerklärung</span>
          <textarea
            rows={2}
            value={draft.shortExplanation}
            onChange={(e) => onChange({ shortExplanation: e.target.value })}
            className="field resize-y"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">Unsere Definition</span>
          <textarea
            rows={6}
            value={draft.definition}
            onChange={(e) => onChange({ definition: e.target.value })}
            className="field resize-y"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">
            Was das für Unternehmen bedeutet
          </span>
          <textarea
            rows={5}
            value={draft.businessRelevance}
            onChange={(e) => onChange({ businessRelevance: e.target.value })}
            className="field resize-y"
          />
        </label>
      </section>

      <section className="panel p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="eyebrow">Quellen</h2>
          <button
            type="button"
            onClick={() =>
              onChange({ sources: [...draft.sources, { ...emptySource }] })
            }
            className="text-sm text-primary hover:underline"
          >
            + Quelle hinzufügen
          </button>
        </div>

        {draft.sources.length === 0 && (
          <p className="text-sm text-muted">
            Noch keine Quellen hinterlegt.
          </p>
        )}

        {draft.sources.map((source, i) => (
          <div
            key={i}
            className="border border-border rounded-lg p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm">Quelle {i + 1}</span>
              <div className="flex items-center gap-3">
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Öffnen ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      sources: draft.sources.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-sm text-danger hover:underline"
                >
                  Entfernen
                </button>
              </div>
            </div>
            <input
              placeholder="Titel"
              value={source.title}
              onChange={(e) => updateSource(i, { title: e.target.value })}
              className="field text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                placeholder="Autor(en)"
                value={source.authors}
                onChange={(e) => updateSource(i, { authors: e.target.value })}
                className="field text-sm"
              />
              <input
                placeholder="Herausgeber"
                value={source.publisher}
                onChange={(e) => updateSource(i, { publisher: e.target.value })}
                className="field text-sm"
              />
              <input
                placeholder="Jahr"
                inputMode="numeric"
                value={source.year}
                onChange={(e) => updateSource(i, { year: e.target.value })}
                className="field text-sm"
              />
              <input
                placeholder="URL"
                value={source.url}
                onChange={(e) => updateSource(i, { url: e.target.value })}
                className="field text-sm"
              />
            </div>
          </div>
        ))}
      </section>

      <section className="panel p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="eyebrow">Verwandte Begriffe</h2>
          <span className="text-sm text-muted">
            {draft.relatedIds.length} ausgewählt
          </span>
        </div>

        {ausgewaehlte.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ausgewaehlte.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  onChange({
                    relatedIds: draft.relatedIds.filter((id) => id !== t.id),
                  })
                }
                className="chip chip-active"
                title="Verknüpfung entfernen"
              >
                {t.name} ✕
              </button>
            ))}
          </div>
        )}

        <input
          placeholder="Begriffe durchsuchen …"
          value={relatedFilter}
          onChange={(e) => setRelatedFilter(e.target.value)}
          className="field text-sm"
        />
        <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {gefilterteBegriffe.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-soft cursor-pointer"
            >
              <input
                type="checkbox"
                checked={draft.relatedIds.includes(t.id)}
                onChange={() =>
                  onChange({
                    relatedIds: draft.relatedIds.includes(t.id)
                      ? draft.relatedIds.filter((id) => id !== t.id)
                      : [...draft.relatedIds, t.id],
                  })
                }
              />
              {t.name}
            </label>
          ))}
          {gefilterteBegriffe.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">Keine Treffer.</p>
          )}
        </div>
      </section>
    </>
  );
}
