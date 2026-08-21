import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRolle } from "@/lib/rollen";
import type { Category, Source, Term } from "@/types/database";

export const revalidate = 0;

type TermRow = Term & { category: Category | null; sources: Source[] };

async function getTerm(slug: string) {
  const supabase = await createClient();

  const { data: term } = await supabase
    .from("terms")
    .select("*, category:categories(*), sources(*)")
    .eq("slug", slug)
    .single();

  if (!term) return null;

  const { data: relations } = await supabase
    .from("term_relations")
    .select("related_term_id")
    .eq("term_id", term.id);

  const relatedIds = (relations ?? []).map((r) => r.related_term_id);

  let related: (Pick<Term, "id" | "slug" | "name"> & {
    category: { slug: string } | null;
  })[] = [];
  if (relatedIds.length > 0) {
    const { data } = await supabase
      .from("terms")
      .select("id, slug, name, category:categories(slug)")
      .in("id", relatedIds)
      .eq("status", "published")
      .order("name");
    related = (data ?? []) as unknown as typeof related;
  }

  return { term: term as TermRow, related };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getTerm(slug);
  if (!result) return { title: "Begriff nicht gefunden" };
  return {
    title: `${result.term.name} – KI-Glossar`,
    description: result.term.short_explanation ?? undefined,
  };
}

export default async function TermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getTerm(slug);
  if (!result) notFound();
  const { term, related } = result;
  const { istRedaktion } = await getRolle();

  return (
    <div
      className="mx-auto max-w-4xl px-4 sm:px-6 py-10"
      data-kat={term.category?.slug ?? undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <Link
          href="/"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
        >
          ← Zur Übersicht
        </Link>
        {istRedaktion && (
          <Link
            href={`/begriff/${term.slug}/bearbeiten`}
            className="btn btn-secondary"
          >
            Bearbeiten
          </Link>
        )}
      </div>

      <article>
        <header className="mb-10">
          {term.category && (
            <Link
              href={`/?kategorie=${term.category.slug}`}
              className="badge badge-kat mb-3"
            >
              {term.category.name}
            </Link>
          )}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1 mb-4">
            {term.name}
          </h1>
          {term.short_explanation && (
            <p className="text-xl text-muted leading-relaxed">
              {term.short_explanation}
            </p>
          )}
          {term.status === "draft" && (
            <span className="badge bg-danger-soft text-danger mt-4">
              Entwurf – noch nicht veröffentlicht
            </span>
          )}
          <div
            aria-hidden
            className="h-1 w-16 rounded-full mt-6"
            style={{ background: "var(--kat, var(--primary))" }}
          />
        </header>

        {/* Die beiden Textblöcke sind bewusst unterschiedlich gestaltet:
            die Definition als ruhiger Fließtext, die Unternehmensbedeutung
            als hervorgehobener Kasten in der Kategoriefarbe. */}
        {term.definition && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">Unsere Definition</h2>
            <div className="prose-block text-lg border-l-2 border-border pl-5">
              {term.definition}
            </div>
          </section>
        )}

        {term.business_relevance && (
          <section className="mb-10">
            <div
              className="rounded-xl p-6 sm:p-7"
              style={{
                background: "var(--kat-soft, var(--primary-soft))",
              }}
            >
              <h2
                className="text-xl font-semibold mb-3"
                style={{ color: "var(--kat, var(--primary))" }}
              >
                Was das für Unternehmen bedeutet
              </h2>
              <div className="prose-block">{term.business_relevance}</div>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="eyebrow-muted mb-3">Verwandte Begriffe</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/begriff/${r.slug}`}
                  data-kat={r.category?.slug ?? undefined}
                  className="chip"
                >
                  {r.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {term.sources.length > 0 && (
          <section className="border-t border-border pt-8">
            <h2 className="eyebrow-muted mb-4">Quellen</h2>
            <ol className="flex flex-col gap-3">
              {term.sources.map((source, i) => (
                <li key={source.id} className="text-sm flex gap-3">
                  <span className="text-muted tabular-nums shrink-0">
                    [{i + 1}]
                  </span>
                  <span className="text-muted">
                    {source.authors && `${source.authors}: `}
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                    {source.publisher && `, ${source.publisher}`}
                    {source.year && ` (${source.year})`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </div>
  );
}
