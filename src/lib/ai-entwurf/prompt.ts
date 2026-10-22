// Prompt-Bausteine für den KI-Entwurf eines Glossareintrags.

export type PromptKategorie = {
  slug: string;
  name: string;
  description: string | null;
};

export function baueSystemPrompt(
  kategorien: PromptKategorie[],
  begriffsnamen: string[]
): string {
  const categoryLines = kategorien
    .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` (${c.description})` : ""}`)
    .join("\n");
  const termLines = begriffsnamen.map((name) => `- ${name}`).join("\n");

  return `Du erstellst Eintraege fuer ein deutschsprachiges KI-Glossar fuer kleine und mittlere Unternehmen.

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
}

export function nutzerAnfrage(begriff: string): string {
  return `Erstelle den Glossareintrag für den Begriff: ${begriff}`;
}
