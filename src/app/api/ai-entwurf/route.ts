import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { extractJson } from "@/lib/server/json";
import { KI_MODELL, textAusAntwort } from "@/lib/server/anthropic";
import { baueSystemPrompt, nutzerAnfrage } from "@/lib/ai-entwurf/prompt";
import { baueEntwurf, sammleSuchtreffer } from "@/lib/ai-entwurf/auswertung";
import { erstelleFortschrittsmelder } from "@/lib/ai-entwurf/fortschritt";
import type { ProgressEvent } from "@/lib/ai-entwurf/typen";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Erstellt per Websuche einen Entwurf für einen neuen Glossareintrag und
// streamt Fortschritt und Ergebnis als NDJSON. Die fachliche Auswertung der
// Modellantwort (Quellenprüfung, Slug, Kategorie, verwandte Begriffe) liegt
// in src/lib/ai-entwurf/auswertung.ts.

function encodeEvent(event: ProgressEvent) {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

const FEHLER_UNLESBAR =
  "Die KI-Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen oder den Begriff manuell anlegen.";

function fehlermeldung(err: unknown): string {
  return err instanceof Anthropic.APIError
    ? `Die KI-Anfrage wurde abgelehnt (${err.status}). Bitte später erneut versuchen.`
    : "Der KI-Entwurf konnte nicht erstellt werden. Bitte erneut versuchen oder den Begriff manuell anlegen.";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Die KI-Entwurfsfunktion ist auf dem Server noch nicht konfiguriert (ANTHROPIC_API_KEY fehlt). Du kannst den Begriff so lange manuell anlegen.",
        code: "missing_api_key",
      },
      { status: 501 }
    );
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const term = body.name?.trim();
  if (!term) {
    return Response.json(
      { error: "Bitte zuerst einen Begriff eingeben." },
      { status: 400 }
    );
  }

  const [{ data: categories }, { data: existingTerms }] = await Promise.all([
    supabase.from("categories").select("id, slug, name, description"),
    supabase.from("terms").select("id, slug, name, short_explanation"),
  ]);

  const categoryList = categories ?? [];
  const termList = existingTerms ?? [];

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          // Client hat die Verbindung bereits geschlossen.
        }
      };

      try {
        send({
          type: "phase",
          label: "Anfrage wird vorbereitet …",
          progress: 0.04,
        });

        const anthropicStream = anthropic.messages.stream({
          model: KI_MODELL,
          max_tokens: 8192,
          system: baueSystemPrompt(
            categoryList,
            termList.map((t) => t.name)
          ),
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 5,
            },
          ],
          messages: [{ role: "user", content: nutzerAnfrage(term) }],
        });

        anthropicStream.on("streamEvent", erstelleFortschrittsmelder(send));

        const finalMessage = await anthropicStream.finalMessage();

        send({
          type: "phase",
          label: "Quellen werden geprüft …",
          progress: 0.96,
        });

        const parsed = extractJson(textAusAntwort(finalMessage.content));
        if (!parsed || typeof parsed !== "object") {
          send({ type: "error", error: FEHLER_UNLESBAR });
          controller.close();
          return;
        }

        const { draft, notes } = baueEntwurf(parsed as Record<string, unknown>, {
          begriff: term,
          kategorien: categoryList,
          begriffe: termList,
          vergebeneSlugs: new Set(termList.map((t) => t.slug)),
          treffer: sammleSuchtreffer(finalMessage.content),
        });

        send({ type: "phase", label: "Fertig", progress: 1 });
        send({ type: "result", draft, notes });
        controller.close();
      } catch (err) {
        console.error("KI-Entwurf fehlgeschlagen:", err);
        send({ type: "error", error: fehlermeldung(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
