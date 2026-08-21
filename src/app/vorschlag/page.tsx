import { Suspense } from "react";
import { SuggestionForm } from "@/components/suggestion-form";

export const metadata = {
  title: "Begriff vorschlagen – KI-Glossar",
  description:
    "Fehlt ein KI-Begriff im Glossar? Vorschlag einreichen – ganz ohne Konto.",
};

export default async function VorschlagPage({
  searchParams,
}: {
  searchParams: Promise<{ begriff?: string }>;
}) {
  const { begriff } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
      <p className="eyebrow mb-3">Mitmachen</p>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
        Einen Begriff vorschlagen
      </h1>
      <p className="text-lg text-muted mb-8 leading-relaxed">
        Dir ist ein KI-Begriff begegnet, den du hier vermisst? Sag uns Bescheid
        – ganz ohne Anmeldung. Wir prüfen jeden Vorschlag und ergänzen ihn, wenn
        er ins Glossar passt.
      </p>

      <Suspense fallback={null}>
        <SuggestionForm vorbelegt={begriff} />
      </Suspense>

      <p className="text-sm text-muted mt-8 leading-relaxed">
        Vorschläge erscheinen nicht automatisch im Glossar. Jeder Eintrag wird
        redaktionell geprüft, recherchiert und mit Quellen belegt, bevor er
        veröffentlicht wird.
      </p>
    </div>
  );
}
