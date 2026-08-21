import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTermForm } from "@/components/new-term-form";
import { getRolle } from "@/lib/rollen";
import type { Category, Term } from "@/types/database";

export const metadata = { title: "Neuer Begriff – KI-Glossar" };
export const dynamic = "force-dynamic";

export default async function NeuerBegriffPage({
  searchParams,
}: {
  searchParams: Promise<{ begriff?: string; vorschlag?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { istRedaktion } = await getRolle();
  if (!istRedaktion) {
    redirect("/");
  }

  const { begriff, vorschlag } = await searchParams;

  const [{ data: categories }, { data: terms }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("terms").select("id, slug, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <p className="eyebrow mb-3">Redaktion</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        Neuen Begriff anlegen
      </h1>
      <p className="text-muted mb-8 max-w-2xl leading-relaxed">
        {vorschlag
          ? "Dieser Begriff stammt aus einem Besuchervorschlag. Sobald du ihn veröffentlichst, wird der Vorschlag als übernommen markiert."
          : "Gib den Begriff ein, lass ihn recherchieren und prüfe den Entwurf, bevor er im Glossar erscheint."}
      </p>
      <NewTermForm
        categories={(categories ?? []) as Category[]}
        existingTerms={(terms ?? []) as Pick<Term, "id" | "slug" | "name">[]}
        vorbelegterBegriff={begriff ?? ""}
        vorschlagId={vorschlag ?? null}
      />
    </div>
  );
}
