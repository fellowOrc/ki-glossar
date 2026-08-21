import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRolle } from "@/lib/rollen";
import { TermEditForm } from "@/components/term-edit-form";
import type { Category, Term, TermStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${slug} bearbeiten – KI-Glossar` };
}

export default async function BearbeitenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { istRedaktion } = await getRolle();
  if (!istRedaktion) {
    redirect("/login");
  }

  const { slug } = await params;
  const supabase = await createClient();

  const { data: term } = await supabase
    .from("terms")
    .select("id, name, slug, category_id, short_explanation, definition, business_relevance, status")
    .eq("slug", slug)
    .single();

  if (!term) notFound();

  const [{ data: sources }, { data: relations }, { data: categories }, { data: alleBegriffe }] =
    await Promise.all([
      supabase
        .from("sources")
        .select("title, authors, publisher, year, url")
        .eq("term_id", term.id)
        .order("id"),
      supabase
        .from("term_relations")
        .select("related_term_id")
        .eq("term_id", term.id),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("terms").select("id, slug, name").order("name"),
    ]);

  const kategorien = (categories ?? []) as Category[];

  const start = {
    name: term.name ?? "",
    slug: term.slug ?? "",
    categoryId: term.category_id ?? kategorien[0]?.id ?? "",
    shortExplanation: term.short_explanation ?? "",
    definition: term.definition ?? "",
    businessRelevance: term.business_relevance ?? "",
    sources: (sources ?? []).map((s) => ({
      title: s.title ?? "",
      authors: s.authors ?? "",
      publisher: s.publisher ?? "",
      year: s.year ? String(s.year) : "",
      url: s.url ?? "",
    })),
    relatedIds: (relations ?? []).map((r) => r.related_term_id as string),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link
        href="/redaktion"
        className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 mb-6"
      >
        ← Zur Redaktion
      </Link>
      <p className="eyebrow mb-3">Bearbeiten</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-8">
        {term.name}
      </h1>

      <TermEditForm
        termId={term.id as string}
        ursprungsSlug={term.slug as string}
        status={term.status as TermStatus}
        start={start}
        categories={kategorien}
        existingTerms={(alleBegriffe ?? []) as Pick<Term, "id" | "slug" | "name">[]}
      />
    </div>
  );
}
