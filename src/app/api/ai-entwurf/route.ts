import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Quellen werden nach der Generierung gegen die echten Suchtreffer abgeglichen.
// Alles, dessen URL nicht aus der Websuche stammt, wird verworfen - sonst
// erfindet das Modell plausibel aussehende, aber nicht existierende Belege.

type ProgressEvent =
  | { type: "phase"; label: string; progress: number }
  | { type: "result"; draft: DraftPayload; notes: string[] }
  | { type: "error"; error: string };

type DraftPayload = {
  name: string;
  slug: string;
  slugTaken: boolean;
  categoryId: string | null;
  shortExplanation: string;
  definition: string;
  businessRelevance: string;
  sources: {
    title: string;
    authors: string;
    publisher: string;
    year: string;
    url: string;
  }[];
  relatedTermIds: string[];
};

function encodeEvent(event: ProgressEvent) {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text].filter(
    (c): c is string => typeof c === "string"
  );

  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // bewusst ignoriert
    }
  }
  return null;
}

// Claude fuegt bei Websuche-gestuetzten Antworten manchmal automatisch
// Zitat-Markup wie <cite index="1-2">...</cite> in den Fliesstext ein, auch
// wenn das JSON-Feld eigentlich nur reiner Text sein soll. Wird hier entfernt,
// der eingeschlossene Text bleibt erhalten.
function stripCitationTags(value: string): string {
  return value.replace(/<\/?cite[^>]*>/gi, "");
}

function asString(value: unknown): string {
  return typeof value === "string" ? stripCitationTags(value).trim() : "";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
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
  const takenSlugs = new Set(termList.map((t) => t.slug));

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
      // bewusst ignoriert
    }
      };

      try {
        send({
          type: "phase",
          label: "Anfrage wird vorbereitet …",
          progress: 0.04,
        });

        const categoryLines = categoryList
          .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` (${c.description})` : ""}`)
          .join("\n");
        const termLines = termList
          .map((t) => `- ${t.name}`)
          .join("\n");

        const systemPrompt = `Du erstellst Eintraege fuer ein deutschsprachiges KI-Glossar fuer kleine und mittlere Unternehmen.

1. Recherchiere den Begriff mit der Websuche. Nutze serioese Quellen: Fachliteratur, wissenschaftliche Paper, Behoerden (BSI, EU-Kommission), Forschungseinrichtungen, Branchenverbaende (Bitkom, VDMA), Herstellerdokumentation. Meide Marketingseiten und SEO-Blogs.
2. Schreibe auf Deutsch: sachlich, praezise, ohne Marketing-Sprache. Zielgruppe ist technisch interessiert, aber nicht vom Fach.

Antworte zum Schluss mit genau einem JSON-Objekt in einem \`\`\`json-Codeblock:
- "name": etablierter Name (Tippfehler korrigieren, gaengige Abkuerzung in Klammern)
- "category_slug": genau einer der Slugs unten
- "short_explanation": ein Satz, max. 160 Zeichen
- "definition": 2-4 Saetze, vermeide zusaetzliche Abkuerzungen
- "business_relevance": 2-3 Saetze: Wo begegnet der Begriff einem KMU, welche Entscheidung oder Pflicht haengt daran?
- "sources": 2-4 Objekte mit "title", "authors", "publisher", "year", "url"
- "related_terms": 2-6 Namen aus der Bestandsliste, exakt wie dort geschrieben

QUELLEN (wichtig): Verwende ausschliesslich URLs, die die Websuche geliefert hat. Erfinde nie URL, Titel, Autor oder Jahr. Kannst du ein Feld nicht belegen, schreibe einen leeren String. Zwei belastbare Quellen sind besser als vier unsichere.

FORMAT (wichtig): Die Textfelder ("short_explanation", "definition", "business_relevance") enthalten reinen Fliesstext ohne Markup. Fuege keine Zitat-Tags wie <cite>...</cite> oder aehnliche Markierungen ein - die Quellenzuordnung geschieht ausschliesslich ueber das separate "sources"-Feld.

KATEGORIEN
${categoryLines}

BESTEHENDE BEGRIFFE (nur daraus "related_terms" waehlen)
${termLines}`;

        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 8192,
          system: systemPrompt,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 5,
            },
          ],
          messages: [
            {
              role: "user",
              content: `Erstelle den Glossareintrag für den Begriff: ${term}`,
            },
          ],
        });

        let searchCount = 0;
        let wroteTextPhase = false;
        let textChars = 0;

        anthropicStream.on("streamEvent", (event) => {
          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (block.type === "server_tool_use") {
              searchCount += 1;
              send({
                type: "phase",
                label:
                  searchCount === 1
                    ? "Recherchiere Fachquellen im Web …"
                    : `Recherchiere Fachquellen im Web (Suche ${searchCount}) …`,
                progress: Math.min(0.15 + searchCount * 0.1, 0.55),
              });
            } else if (block.type === "web_search_tool_result") {
              send({
                type: "phase",
                label: "Suchergebnisse werden ausgewertet …",
                progress: Math.min(0.2 + searchCount * 0.1, 0.6),
              });
            } else if (block.type === "text" && !wroteTextPhase) {
              wroteTextPhase = true;
              send({
                type: "phase",
                label: "Entwurf wird formuliert …",
                progress: 0.65,
              });
            }
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            textChars += event.delta.text.length;
            const progress = Math.min(0.65 + textChars / 4000, 0.95);
            if (textChars % 400 < 24) {
              send({
                type: "phase",
                label: "Entwurf wird formuliert …",
                progress,
              });
            }
          }
        });

        const finalMessage = await anthropicStream.finalMessage();

        send({
          type: "phase",
          label: "Quellen werden geprüft …",
          progress: 0.96,
        });

        const verifiedHosts = new Set<string>();
        const verifiedUrls = new Set<string>();
        for (const block of finalMessage.content) {
          if (block.type !== "web_search_tool_result") continue;
          const content = block.content;
          if (!Array.isArray(content)) continue;
          for (const item of content) {
            if (item.type === "web_search_result" && item.url) {
              verifiedUrls.add(item.url);
              const host = hostOf(item.url);
              if (host) verifiedHosts.add(host);
            }
          }
        }

        const text = finalMessage.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        const parsed = extractJson(text);
        if (!parsed || typeof parsed !== "object") {
          send({
            type: "error",
            error:
              "Die KI-Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen oder den Begriff manuell anlegen.",
          });
          controller.close();
          return;
        }

        const raw = parsed as Record<string, unknown>;
        const notes: string[] = [];

        const name = asString(raw.name) || term;

        const baseSlug = slugify(name) || slugify(term);
        let slug = baseSlug;
        let counter = 2;
        while (takenSlugs.has(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter += 1;
        }
        const slugTaken = takenSlugs.has(baseSlug);
        if (slugTaken) {
          notes.push(
            `Zu „${name}" gibt es bereits einen Eintrag mit dem Slug „${baseSlug}". Der Vorschlag nutzt daher „${slug}" – bitte prüfe, ob der Begriff wirklich neu ist.`
          );
        }

        const categorySlug = asString(raw.category_slug);
        const category =
          categoryList.find((c) => c.slug === categorySlug) ?? null;
        if (!category && categoryList.length > 0) {
          notes.push(
            "Die KI konnte keine eindeutige Kategorie zuordnen – bitte selbst auswählen."
          );
        }

        const rawSources = Array.isArray(raw.sources) ? raw.sources : [];
        const sources: DraftPayload["sources"] = [];
        let droppedSources = 0;
        for (const entry of rawSources) {
          if (!entry || typeof entry !== "object") continue;
          const s = entry as Record<string, unknown>;
          const url = asString(s.url);
          const title = asString(s.title);
          if (!title) continue;
          const host = hostOf(url);
          const trusted =
            url !== "" && (verifiedUrls.has(url) || (host !== null && verifiedHosts.has(host)));
          if (!trusted) {
            droppedSources += 1;
            continue;
          }
          sources.push({
            title,
            authors: asString(s.authors),
            publisher: asString(s.publisher),
            year: asString(s.year).replace(/[^0-9]/g, "").slice(0, 4),
            url,
          });
        }
        if (droppedSources > 0) {
          notes.push(
            `${droppedSources} Quellenvorschlag${
              droppedSources === 1 ? "" : "e"
            } wurde${
              droppedSources === 1 ? "" : "n"
            } verworfen, weil die URL nicht aus den Suchtreffern stammte (Schutz vor erfundenen Quellen).`
          );
        }
        if (sources.length === 0) {
          notes.push(
            "Es konnten keine belastbaren Quellen ermittelt werden. Bitte selbst ergänzen."
          );
        }

        const rawRelated = Array.isArray(raw.related_terms)
          ? raw.related_terms
          : [];
        const relatedTermIds: string[] = [];
        for (const entry of rawRelated) {
          const relatedName = asString(entry).toLowerCase();
          if (!relatedName) continue;
          const match = termList.find(
            (t) => t.name.toLowerCase() === relatedName
          );
          if (match && !relatedTermIds.includes(match.id)) {
            relatedTermIds.push(match.id);
          }
        }

        const draft: DraftPayload = {
          name,
          slug,
          slugTaken,
          categoryId: category?.id ?? null,
          shortExplanation: asString(raw.short_explanation),
          definition: asString(raw.definition),
          businessRelevance: asString(raw.business_relevance),
          sources,
          relatedTermIds,
        };

        send({ type: "phase", label: "Fertig", progress: 1 });
        send({ type: "result", draft, notes });
        controller.close();
      } catch (err) {
        console.error("KI-Entwurf fehlgeschlagen:", err);
        send({
          type: "error",
          error:
            err instanceof Anthropic.APIError
              ? `Die KI-Anfrage wurde abgelehnt (${err.status}). Bitte später erneut versuchen.`
              : "Der KI-Entwurf konnte nicht erstellt werden. Bitte erneut versuchen oder den Begriff manuell anlegen.",
        });
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
