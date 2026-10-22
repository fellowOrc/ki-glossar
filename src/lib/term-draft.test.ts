import { describe, expect, it } from "vitest";
import {
  emptySource,
  entwurfAusBestand,
  entwurfAusKi,
  istDoppelterSlug,
  istSpeicherbar,
  leererEntwurf,
  quellDaten,
  speicherParameter,
  termSpalten,
  type TermDraft,
} from "@/lib/term-draft";
import type { Category } from "@/types/database";

const kategorien: Category[] = [
  { id: "k1", slug: "a", name: "A", sort_order: 1, description: null },
  { id: "k2", slug: "b", name: "B", sort_order: 2, description: null },
];

const draft: TermDraft = {
  name: "  Token ",
  slug: " token ",
  categoryId: "",
  shortExplanation: "  ",
  definition: " Ein Baustein. ",
  businessRelevance: "",
  sources: [
    { title: " Paper ", authors: " ", publisher: "ACL", year: "2017", url: " https://x.org " },
    { title: "   ", authors: "A", publisher: "", year: "", url: "" },
  ],
  relatedIds: ["r1", "r2"],
};

describe("leererEntwurf / entwurfAusKi / entwurfAusBestand", () => {
  it("belegt Slug und erste Kategorie vor", () => {
    expect(leererEntwurf(kategorien, "Künstliche Intelligenz")).toEqual({
      name: "Künstliche Intelligenz",
      slug: "kuenstliche-intelligenz",
      categoryId: "k1",
      shortExplanation: "",
      definition: "",
      businessRelevance: "",
      sources: [emptySource],
      relatedIds: [],
    });
    expect(leererEntwurf([]).categoryId).toBe("");
  });

  it("übernimmt den KI-Entwurf und ergänzt Kategorie und leere Quelle", () => {
    const d = entwurfAusKi(
      {
        name: "RAG",
        slug: "rag",
        categoryId: null,
        shortExplanation: "k",
        definition: "d",
        businessRelevance: "b",
        sources: [],
        relatedTermIds: ["t1"],
      },
      kategorien
    );
    expect(d.categoryId).toBe("k1");
    expect(d.sources).toEqual([emptySource]);
    expect(d.relatedIds).toEqual(["t1"]);
  });

  it("macht aus Datenbankzeilen einen Formularzustand", () => {
    expect(
      entwurfAusBestand(
        {
          name: "Token",
          slug: "token",
          category_id: null,
          short_explanation: null,
          definition: "D",
          business_relevance: null,
        },
        [{ title: "T", authors: null, publisher: null, year: 2020, url: null }],
        ["r1"],
        kategorien
      )
    ).toEqual({
      name: "Token",
      slug: "token",
      categoryId: "k1",
      shortExplanation: "",
      definition: "D",
      businessRelevance: "",
      sources: [{ title: "T", authors: "", publisher: "", year: "2020", url: "" }],
      relatedIds: ["r1"],
    });
  });
});

describe("Speicher-Mapping", () => {
  it("trimmt Felder und speichert leere als null", () => {
    expect(termSpalten(draft)).toEqual({
      name: "Token",
      slug: "token",
      category_id: null,
      short_explanation: null,
      definition: "Ein Baustein.",
      business_relevance: null,
    });
  });

  it("übergeht Quellen ohne Titel und wandelt das Jahr in eine Zahl", () => {
    expect(quellDaten(draft.sources)).toEqual([
      {
        title: "Paper",
        authors: null,
        publisher: "ACL",
        year: 2017,
        url: "https://x.org",
      },
    ]);
  });

  it("baut die Argumente für begriff_speichern", () => {
    expect(
      speicherParameter(draft, {
        termId: null,
        status: "published",
        vorschlagId: "v1",
      })
    ).toEqual({
      p_term_id: null,
      p_daten: termSpalten(draft),
      p_status: "published",
      p_quellen: quellDaten(draft.sources),
      p_verwandte: ["r1", "r2"],
      p_vorschlag_id: "v1",
    });
    expect(
      speicherParameter(draft, { termId: "t", status: null }).p_vorschlag_id
    ).toBeNull();
  });

  it("prüft Pflichtfelder und erkennt doppelte Slugs", () => {
    expect(istSpeicherbar(draft)).toBe(true);
    expect(istSpeicherbar({ ...draft, slug: "  " })).toBe(false);
    expect(istDoppelterSlug({ message: "duplicate key value" })).toBe(true);
    expect(istDoppelterSlug({ message: "permission denied" })).toBe(false);
    expect(istDoppelterSlug(null)).toBe(false);
  });
});
