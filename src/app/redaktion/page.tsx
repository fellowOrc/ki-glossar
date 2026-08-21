import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRolle } from "@/lib/rollen";
import { ReviewList, type ReviewTerm } from "@/components/review-list";
import { SuggestionList, type Suggestion } from "@/components/suggestion-list";

export const metadata = { title: "Redaktion – KI-Glossar" };
export const dynamic = "force-dynamic";

export default async function RedaktionPage() {
  const { istRedaktion } = await getRolle();
  if (!istRedaktion) {
    redirect("/");
  }

  const supabase = await createClient();

  const [{ data: suggestions }, { data: drafts }, { data: alleBegriffe }] =
    await Promise.all([
      supabase
        .from("suggestions")
        .select("id, term_name, note, contact_email, status, created_at")
        .order("status", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("terms")
        .select(
          "id, name, slug, short_explanation, definition, business_relevance, created_at, created_by, moderation_status, moderation_notes, moderation_checked_at, category:categories(name)"
        )
        .eq("status", "draft")
        .order("created_at", { ascending: false }),
      supabase.from("terms").select("name, status"),
    ]);

  const suggestionList = (suggestions ?? []) as Suggestion[];
  const draftList = (drafts ?? []) as unknown as ReviewTerm[];

  const bereitsVorhanden = Object.fromEntries(
    (alleBegriffe ?? []).map((t) => [
      t.name.trim().toLowerCase(),
      t.status === "published" ? "veröffentlicht" : "Entwurf",
    ])
  );

  const authorIds = Array.from(
    new Set(draftList.map((t) => t.created_by).filter((id): id is string => !!id))
  );
  let authorEmails: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", authorIds);
    authorEmails = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.email ?? "unbekannt"])
    );
  }

  const offeneVorschlaege = suggestionList.filter((s) => s.status === "neu");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <p className="eyebrow mb-3">Redaktion</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        Redaktionsübersicht
      </h1>
      <p className="text-muted mb-10 max-w-2xl leading-relaxed">
        Hier laufen Vorschläge von Besuchern und unveröffentlichte Entwürfe
        zusammen. Nichts davon ist öffentlich sichtbar, bis du es freigibst.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        <div className="panel p-5">
          <p className="text-3xl font-semibold">{offeneVorschlaege.length}</p>
          <p className="text-sm text-muted mt-1">offene Vorschläge</p>
        </div>
        <div className="panel p-5">
          <p className="text-3xl font-semibold">{draftList.length}</p>
          <p className="text-sm text-muted mt-1">Entwürfe</p>
        </div>
        <div className="panel p-5">
          <p className="text-3xl font-semibold">
            {(alleBegriffe ?? []).filter((t) => t.status === "published").length}
          </p>
          <p className="text-sm text-muted mt-1">veröffentlicht</p>
        </div>
      </div>

      <section className="mb-14">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <h2 className="text-xl font-semibold">Vorschläge von Besuchern</h2>
          <Link
            href="/vorschlag"
            className="text-sm text-primary hover:underline"
          >
            Formular ansehen
          </Link>
        </div>
        <SuggestionList
          suggestions={suggestionList}
          bereitsVorhanden={bereitsVorhanden}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <h2 className="text-xl font-semibold">Entwürfe zur Freigabe</h2>
          <Link
            href="/neuer-begriff"
            className="text-sm text-primary hover:underline"
          >
            Neuen Begriff anlegen
          </Link>
        </div>
        {draftList.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="text-muted">
              Aktuell liegen keine Entwürfe zur Prüfung vor.
            </p>
          </div>
        ) : (
          <ReviewList terms={draftList} authorEmails={authorEmails} />
        )}
      </section>
    </div>
  );
}
