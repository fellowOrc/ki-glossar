import { createClient } from "@/lib/supabase/server";
import { QuizClient } from "@/components/quiz-client";
import { OPTIONEN_ANZAHL, baueQuizFragen, quizTauglich } from "@/lib/quiz";

export const metadata = { title: "Teste dein Wissen – KI-Glossar" };
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const supabase = await createClient();
  const { data: terms } = await supabase
    .from("terms")
    .select("id, slug, name, short_explanation, definition")
    .eq("status", "published");

  const pool = quizTauglich(terms ?? []);

  if (pool.length < OPTIONEN_ANZAHL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <p className="eyebrow mb-3">Teste dein Wissen</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Noch nicht genug Begriffe für „Teste dein Wissen“
        </h1>
        <p className="text-muted">
          Dafür braucht es mindestens {OPTIONEN_ANZAHL} veröffentlichte
          Begriffe mit Beschreibung. Aktuell {pool.length === 1 ? "ist" : "sind"} es{" "}
          {pool.length}.
        </p>
      </div>
    );
  }

  const fragen = baueQuizFragen(pool);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <p className="eyebrow mb-3">Teste dein Wissen</p>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">
        Wie fit bist du in KI-Begriffen?
      </h1>
      <QuizClient fragen={fragen} />
    </div>
  );
}
