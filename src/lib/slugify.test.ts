import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slugify";

// Charakterisierungstests: halten fest, wie slugify sich heute verhält.
describe("slugify", () => {
  it("wandelt Umlaute und ß in Umschreibungen um", () => {
    expect(slugify("Künstliche Größe")).toBe("kuenstliche-groesse");
    expect(slugify("Maß")).toBe("mass");
  });

  it("entfernt Akzente", () => {
    expect(slugify("Café Déjà-vu")).toBe("cafe-deja-vu");
  });

  it("fasst Sonderzeichen und Leerraum zu einem Bindestrich zusammen", () => {
    expect(slugify("  Retrieval Augmented Generation (RAG)  ")).toBe(
      "retrieval-augmented-generation-rag"
    );
    expect(slugify("A/B -- Test")).toBe("a-b-test");
  });

  it("liefert für leere oder reine Sonderzeichen einen leeren String", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});
