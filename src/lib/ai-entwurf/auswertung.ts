import type Anthropic from "@anthropic-ai/sdk";
import { slugify } from "@/lib/slugify";
import type { DraftPayload, EntwurfQuelle } from "@/lib/ai-entwurf/typen";

// Macht aus der rohen Modellantwort einen geprüften Entwurf. Alles hier ist
// reine Logik ohne Netz und Datenbank.
//
// Quellen werden gegen die echten Suchtreffer abgeglichen. Alles, dessen URL
// nicht aus der Websuche stammt, wird verworfen – sonst erfindet das Modell
// plausibel aussehende, aber nicht existierende Belege.

export type BestandsKategorie = { id: string; slug: string };
export type BestandsBegriff = { id: string; name: string };

export type Suchtreffer = { urls: Set<string>; hosts: Set<string> };

// Claude fügt bei Websuche-gestützten Antworten manchmal automatisch
// Zitat-Markup wie <cite index="1-2">...</cite> in den Fließtext ein, auch
// wenn das JSON-Feld eigentlich nur reiner Text sein soll. Wird hier entfernt,
// der eingeschlossene Text bleibt erhalten.
export function stripCitationTags(value: string): string {
  return value.replace(/<\/?cite[^>]*>/gi, "");
}

export function asString(value: unknown): string {
  return typeof value === "string" ? stripCitationTags(value).trim() : "";
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Sammelt URLs und Hosts aller Websuche-Treffer der Modellantwort.
export function sammleSuchtreffer(content: Anthropic.ContentBlock[]): Suchtreffer {
  const urls = new Set<string>();
  const hosts = new Set<string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const items = block.content;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item.type === "web_search_result" && item.url) {
        urls.add(item.url);
        const host = hostOf(item.url);
        if (host) hosts.add(host);
      }
    }
  }
  return { urls, hosts };
}

// Freier Slug: der aus dem Namen abgeleitete, bei Kollision mit -2, -3 …
export function eindeutigerSlug(
  name: string,
  begriff: string,
  vergebeneSlugs: Set<string>
): { slug: string; baseSlug: string; slugTaken: boolean } {
  const baseSlug = slugify(name) || slugify(begriff);
  let slug = baseSlug;
  let counter = 2;
  while (vergebeneSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return { slug, baseSlug, slugTaken: vergebeneSlugs.has(baseSlug) };
}

// Übernimmt nur Quellen mit Titel, deren URL (oder zumindest Host) aus den
// Suchtreffern stammt. Zählt, wie viele wegen der URL verworfen wurden.
export function pruefeQuellen(
  rohQuellen: unknown,
  treffer: Suchtreffer
): { sources: EntwurfQuelle[]; verworfen: number } {
  const liste = Array.isArray(rohQuellen) ? rohQuellen : [];
  const sources: EntwurfQuelle[] = [];
  let verworfen = 0;
  for (const entry of liste) {
    if (!entry || typeof entry !== "object") continue;
    const s = entry as Record<string, unknown>;
    const url = asString(s.url);
    const title = asString(s.title);
    if (!title) continue;
    const host = hostOf(url);
    const trusted =
      url !== "" &&
      (treffer.urls.has(url) || (host !== null && treffer.hosts.has(host)));
    if (!trusted) {
      verworfen += 1;
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
  return { sources, verworfen };
}

// Ordnet die vom Modell genannten Namen bestehenden Begriffen zu
// (Groß-/Kleinschreibung egal, ohne Dubletten, Reihenfolge wie genannt).
export function ordneVerwandteZu(
  rohNamen: unknown,
  bestand: BestandsBegriff[]
): string[] {
  const liste = Array.isArray(rohNamen) ? rohNamen : [];
  const ids: string[] = [];
  for (const entry of liste) {
    const relatedName = asString(entry).toLowerCase();
    if (!relatedName) continue;
    const match = bestand.find((t) => t.name.toLowerCase() === relatedName);
    if (match && !ids.includes(match.id)) {
      ids.push(match.id);
    }
  }
  return ids;
}

function hinweisVerworfeneQuellen(anzahl: number): string {
  const vorschlag = anzahl === 1 ? "Quellenvorschlag wurde" : "Quellenvorschläge wurden";
  return `${anzahl} ${vorschlag} verworfen, weil die URL nicht aus den Suchtreffern stammte (Schutz vor erfundenen Quellen).`;
}

// Baut aus dem geparsten Modell-JSON den Entwurf und die Hinweise für die
// Redaktion (Slug-Kollision, fehlende Kategorie, verworfene/fehlende Quellen).
export function baueEntwurf(
  roh: Record<string, unknown>,
  kontext: {
    begriff: string;
    kategorien: BestandsKategorie[];
    begriffe: BestandsBegriff[];
    vergebeneSlugs: Set<string>;
    treffer: Suchtreffer;
  }
): { draft: DraftPayload; notes: string[] } {
  const notes: string[] = [];

  const name = asString(roh.name) || kontext.begriff;

  const { slug, baseSlug, slugTaken } = eindeutigerSlug(
    name,
    kontext.begriff,
    kontext.vergebeneSlugs
  );
  if (slugTaken) {
    notes.push(
      `Zu „${name}" gibt es bereits einen Eintrag mit dem Slug „${baseSlug}". Der Vorschlag nutzt daher „${slug}" – bitte prüfe, ob der Begriff wirklich neu ist.`
    );
  }

  const categorySlug = asString(roh.category_slug);
  const category =
    kontext.kategorien.find((c) => c.slug === categorySlug) ?? null;
  if (!category && kontext.kategorien.length > 0) {
    notes.push(
      "Die KI konnte keine eindeutige Kategorie zuordnen – bitte selbst auswählen."
    );
  }

  const { sources, verworfen } = pruefeQuellen(roh.sources, kontext.treffer);
  if (verworfen > 0) {
    notes.push(hinweisVerworfeneQuellen(verworfen));
  }
  if (sources.length === 0) {
    notes.push(
      "Es konnten keine belastbaren Quellen ermittelt werden. Bitte selbst ergänzen."
    );
  }

  const draft: DraftPayload = {
    name,
    slug,
    slugTaken,
    categoryId: category?.id ?? null,
    shortExplanation: asString(roh.short_explanation),
    definition: asString(roh.definition),
    businessRelevance: asString(roh.business_relevance),
    sources,
    relatedTermIds: ordneVerwandteZu(roh.related_terms, kontext.begriffe),
  };

  return { draft, notes };
}
