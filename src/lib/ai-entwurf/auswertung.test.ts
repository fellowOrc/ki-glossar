import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import {
  asString,
  baueEntwurf,
  eindeutigerSlug,
  hostOf,
  ordneVerwandteZu,
  pruefeQuellen,
  sammleSuchtreffer,
  type Suchtreffer,
} from "@/lib/ai-entwurf/auswertung";
import { erstelleFortschrittsmelder } from "@/lib/ai-entwurf/fortschritt";
import { baueSystemPrompt, nutzerAnfrage } from "@/lib/ai-entwurf/prompt";

const treffer: Suchtreffer = {
  urls: new Set(["https://www.bsi.bund.de/ki", "https://arxiv.org/abs/1"]),
  hosts: new Set(["bsi.bund.de", "arxiv.org"]),
};

describe("asString / hostOf", () => {
  it("entfernt Zitat-Tags und trimmt, Nicht-Strings werden leer", () => {
    expect(asString(' <cite index="1-2">Text</cite> ')).toBe("Text");
    expect(asString(42)).toBe("");
  });

  it("normalisiert Hosts ohne www und klein geschrieben", () => {
    expect(hostOf("https://WWW.Example.org/pfad")).toBe("example.org");
    expect(hostOf("keine url")).toBeNull();
  });
});

describe("sammleSuchtreffer", () => {
  it("sammelt nur URLs aus Websuche-Ergebnissen", () => {
    const content = [
      { type: "text", text: "x" },
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://www.bsi.bund.de/ki" },
          { type: "web_search_result", url: "" },
        ],
      },
      { type: "web_search_tool_result", content: { type: "error" } },
    ] as unknown as Anthropic.ContentBlock[];
    const t = sammleSuchtreffer(content);
    expect([...t.urls]).toEqual(["https://www.bsi.bund.de/ki"]);
    expect([...t.hosts]).toEqual(["bsi.bund.de"]);
  });
});

describe("eindeutigerSlug", () => {
  it("nutzt den Namen, bei Kollision mit Zählersuffix", () => {
    expect(eindeutigerSlug("Prompt Injection", "x", new Set())).toEqual({
      slug: "prompt-injection",
      baseSlug: "prompt-injection",
      slugTaken: false,
    });
    expect(
      eindeutigerSlug("RAG", "x", new Set(["rag", "rag-2"]))
    ).toEqual({ slug: "rag-3", baseSlug: "rag", slugTaken: true });
  });

  it("weicht auf den eingegebenen Begriff aus, wenn der Name keinen Slug ergibt", () => {
    expect(eindeutigerSlug("!!!", "Agent", new Set()).slug).toBe("agent");
  });
});

describe("pruefeQuellen", () => {
  it("behält belegte Quellen, verwirft unbelegte und ignoriert titellose", () => {
    const { sources, verworfen } = pruefeQuellen(
      [
        { title: "BSI", url: "https://www.bsi.bund.de/ki", year: "ca. 2024!" },
        { title: "Gleicher Host", url: "https://bsi.bund.de/andere-seite" },
        { title: "Erfunden", url: "https://erfunden.example/x" },
        { title: "Ohne URL", url: "" },
        { title: "", url: "https://arxiv.org/abs/1" },
        "kein Objekt",
      ],
      treffer
    );
    expect(sources).toEqual([
      {
        title: "BSI",
        authors: "",
        publisher: "",
        year: "2024",
        url: "https://www.bsi.bund.de/ki",
      },
      {
        title: "Gleicher Host",
        authors: "",
        publisher: "",
        year: "",
        url: "https://bsi.bund.de/andere-seite",
      },
    ]);
    expect(verworfen).toBe(2);
  });

  it("verträgt fehlende Quellenliste", () => {
    expect(pruefeQuellen(undefined, treffer)).toEqual({ sources: [], verworfen: 0 });
  });
});

describe("ordneVerwandteZu", () => {
  const bestand = [
    { id: "1", name: "Token" },
    { id: "2", name: "Large Language Model (LLM)" },
  ];
  it("ordnet unabhängig von Groß-/Kleinschreibung zu, ohne Dubletten", () => {
    expect(
      ordneVerwandteZu(
        ["large language model (llm)", "Token", "TOKEN", "Unbekannt", 3],
        bestand
      )
    ).toEqual(["2", "1"]);
  });
});

describe("baueEntwurf", () => {
  const kontext = {
    begriff: "rag",
    kategorien: [
      { id: "k1", slug: "grundlagen" },
      { id: "k2", slug: "generative-ki" },
    ],
    begriffe: [{ id: "t1", name: "Token" }],
    vergebeneSlugs: new Set(["retrieval-augmented-generation-rag"]),
    treffer,
  };

  it("baut Entwurf und Hinweise wie bisher", () => {
    const { draft, notes } = baueEntwurf(
      {
        name: "Retrieval Augmented Generation (RAG)",
        category_slug: "gibt-es-nicht",
        short_explanation: "Kurz <cite index=\"1\">belegt</cite>.",
        definition: " Definition ",
        business_relevance: "Relevanz",
        sources: [
          { title: "BSI", url: "https://www.bsi.bund.de/ki" },
          { title: "Erfunden", url: "https://x.example" },
        ],
        related_terms: ["token"],
      },
      kontext
    );

    expect(draft).toEqual({
      name: "Retrieval Augmented Generation (RAG)",
      slug: "retrieval-augmented-generation-rag-2",
      slugTaken: true,
      categoryId: null,
      shortExplanation: "Kurz belegt.",
      definition: "Definition",
      businessRelevance: "Relevanz",
      sources: [
        {
          title: "BSI",
          authors: "",
          publisher: "",
          year: "",
          url: "https://www.bsi.bund.de/ki",
        },
      ],
      relatedTermIds: ["t1"],
    });
    expect(notes).toEqual([
      "Zu „Retrieval Augmented Generation (RAG)\" gibt es bereits einen Eintrag mit dem Slug „retrieval-augmented-generation-rag\". Der Vorschlag nutzt daher „retrieval-augmented-generation-rag-2\" – bitte prüfe, ob der Begriff wirklich neu ist.",
      "Die KI konnte keine eindeutige Kategorie zuordnen – bitte selbst auswählen.",
      "1 Quellenvorschlag wurde verworfen, weil die URL nicht aus den Suchtreffern stammte (Schutz vor erfundenen Quellen).",
    ]);
  });

  it("nutzt den Begriff als Namen und meldet fehlende Quellen", () => {
    const { draft, notes } = baueEntwurf(
      {
        category_slug: "grundlagen",
        sources: [
          { title: "A", url: "https://a.example" },
          { title: "B", url: "https://b.example" },
        ],
      },
      { ...kontext, vergebeneSlugs: new Set() }
    );
    expect(draft.name).toBe("rag");
    expect(draft.slug).toBe("rag");
    expect(draft.categoryId).toBe("k1");
    // Charakterisierung: Der Plural lautet bisher „Quellenvorschlage“ (ohne
    // Umlaut). Das ist ein bekannter Fehler, der bewusst NICHT im Refactoring
    // korrigiert wird – siehe Fehlerliste.
    expect(notes).toEqual([
      "2 Quellenvorschlage wurden verworfen, weil die URL nicht aus den Suchtreffern stammte (Schutz vor erfundenen Quellen).",
      "Es konnten keine belastbaren Quellen ermittelt werden. Bitte selbst ergänzen.",
    ]);
  });
});

describe("erstelleFortschrittsmelder", () => {
  it("meldet Suchen, Auswertung und Formulieren mit steigendem Fortschritt", () => {
    const gemeldet: { label: string; progress: number }[] = [];
    const melde = erstelleFortschrittsmelder((e) =>
      gemeldet.push({ label: e.label, progress: e.progress })
    );
    melde({ type: "content_block_start", content_block: { type: "server_tool_use" } });
    melde({ type: "content_block_start", content_block: { type: "web_search_tool_result" } });
    melde({ type: "content_block_start", content_block: { type: "server_tool_use" } });
    melde({ type: "content_block_start", content_block: { type: "text" } });
    melde({ type: "content_block_start", content_block: { type: "text" } });
    melde({ type: "content_block_delta", delta: { type: "text_delta", text: "x".repeat(10) } });
    melde({ type: "content_block_delta", delta: { type: "text_delta", text: "x".repeat(395) } });
    melde({ type: "message_stop" });

    expect(gemeldet).toEqual([
      { label: "Recherchiere Fachquellen im Web …", progress: 0.25 },
      { label: "Suchergebnisse werden ausgewertet …", progress: 0.30000000000000004 },
      { label: "Recherchiere Fachquellen im Web (Suche 2) …", progress: 0.35 },
      { label: "Entwurf wird formuliert …", progress: 0.65 },
      { label: "Entwurf wird formuliert …", progress: 0.65 + 10 / 4000 },
      { label: "Entwurf wird formuliert …", progress: 0.65 + 405 / 4000 },
    ]);
  });
});

describe("Prompt", () => {
  it("listet Kategorien und Begriffe", () => {
    const prompt = baueSystemPrompt(
      [
        { slug: "grundlagen", name: "Grundlagen", description: "Basiswissen" },
        { slug: "recht", name: "Recht", description: null },
      ],
      ["Token", "Agent"]
    );
    expect(prompt).toContain("KATEGORIEN\n- grundlagen: Grundlagen (Basiswissen)\n- recht: Recht\n");
    expect(prompt.endsWith("waehlen)\n- Token\n- Agent")).toBe(true);
    expect(nutzerAnfrage("RAG")).toBe("Erstelle den Glossareintrag für den Begriff: RAG");
  });
});
