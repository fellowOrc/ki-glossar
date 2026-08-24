import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TermBrowser } from "@/components/term-browser";
import type { Category, TermWithCategory } from "@/types/database";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: terms }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("terms")
      .select("*, category:categories(*)")
      .eq("status", "published")
      .order("name"),
  ]);

  const termList = (terms ?? []) as unknown as TermWithCategory[];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <section className="mb-14">
        <p className="eyebrow mb-3">Nachschlagewerk</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight max-w-3xl leading-[1.15]">
          KI-Begriffe - Erklärt. Verknüpft.
        </h1>
        <p className="text-lg text-muted mt-5 max-w-2xl leading-relaxed">
          Von "Agentic AI" bis "Zero-Shot Learning": {termList.length} zentrale
          Begriffe rund um künstliche Intelligenz – kompakt erklärt, mit konkretem Bezug zur betrieblichen Praxis im Mittelstand und nützlichen
          Quellenangaben.
        </p>
      </section>

      <div id="begriffe" className="scroll-mt-20">
        <TermBrowser
          terms={termList}
          categories={(categories ?? []) as Category[]}
        />
      </div>
    </div>
  );
}
