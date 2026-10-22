import { slugify } from "@/lib/slugify";
import type { DraftPayload } from "@/lib/ai-entwurf/typen";
import type { Category } from "@/types/database";

// Der Formularzustand eines Glossareintrags und die Übersetzung von und zu
// den Datenbankzeilen. Anlegen und Bearbeiten nutzen dieselben Funktionen,
// damit beide Wege Felder gleich behandeln (trimmen, leere Felder als null).

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

// Formularzustand aus dem Ergebnis von /api/ai-entwurf. Ohne Kategorie wird
// die erste vorbelegt, ohne Quellen eine leere Zeile angeboten.
export function entwurfAusKi(
  payload: Omit<DraftPayload, "slugTaken">,
  categories: Category[]
): TermDraft {
  return {
    name: payload.name,
    slug: payload.slug,
    categoryId: payload.categoryId ?? categories[0]?.id ?? "",
    shortExplanation: payload.shortExplanation,
    definition: payload.definition,
    businessRelevance: payload.businessRelevance,
    sources:
      payload.sources.length > 0 ? payload.sources : [{ ...emptySource }],
    relatedIds: payload.relatedTermIds,
  };
}

type BestandsTerm = {
  name: string | null;
  slug: string | null;
  category_id: string | null;
  short_explanation: string | null;
  definition: string | null;
  business_relevance: string | null;
};

type BestandsQuelle = {
  title: string | null;
  authors: string | null;
  publisher: string | null;
  year: number | null;
  url: string | null;
};

// Formularzustand aus einem gespeicherten Eintrag (Bearbeiten-Seite).
export function entwurfAusBestand(
  term: BestandsTerm,
  sources: BestandsQuelle[],
  relatedIds: string[],
  categories: Category[]
): TermDraft {
  return {
    name: term.name ?? "",
    slug: term.slug ?? "",
    categoryId: term.category_id ?? categories[0]?.id ?? "",
    shortExplanation: term.short_explanation ?? "",
    definition: term.definition ?? "",
    businessRelevance: term.business_relevance ?? "",
    sources: sources.map((s) => ({
      title: s.title ?? "",
      authors: s.authors ?? "",
      publisher: s.publisher ?? "",
      year: s.year ? String(s.year) : "",
      url: s.url ?? "",
    })),
    relatedIds,
  };
}

// Pflichtfelder für das Speichern.
export function istSpeicherbar(draft: TermDraft): boolean {
  return Boolean(draft.name.trim() && draft.slug.trim());
}

// Spalten der Tabelle terms (ohne status und created_by).
export function termSpalten(draft: TermDraft) {
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    category_id: draft.categoryId || null,
    short_explanation: draft.shortExplanation.trim() || null,
    definition: draft.definition.trim() || null,
    business_relevance: draft.businessRelevance.trim() || null,
  };
}

// Zeilen der Tabelle sources; Quellen ohne Titel werden übergangen.
export function quellZeilen(termId: string, sources: SourceRow[]) {
  return sources
    .filter((s) => s.title.trim())
    .map((s) => ({
      term_id: termId,
      title: s.title.trim(),
      authors: s.authors.trim() || null,
      publisher: s.publisher.trim() || null,
      year: s.year ? parseInt(s.year, 10) : null,
      url: s.url.trim() || null,
    }));
}

// Verknüpfungen werden in beide Richtungen gespeichert.
export function relationsPaare(termId: string, relatedIds: string[]) {
  return relatedIds.flatMap((relatedId) => [
    { term_id: termId, related_term_id: relatedId },
    { term_id: relatedId, related_term_id: termId },
  ]);
}

// Supabase meldet einen doppelten Slug als Unique-Verletzung („duplicate key“).
export function istDoppelterSlug(error: { message: string } | null | undefined) {
  return Boolean(error?.message.includes("duplicate"));
}
