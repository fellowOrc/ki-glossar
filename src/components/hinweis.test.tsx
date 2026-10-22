import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Hinweis } from "@/components/hinweis";
import { formatDatum } from "@/lib/format";

// Das erzeugte HTML muss exakt dem bisher von Hand geschriebenen entsprechen.
describe("Hinweis", () => {
  it("rendert den Fehlerkasten wie bisher", () => {
    expect(renderToStaticMarkup(<Hinweis>Fehler</Hinweis>)).toBe(
      '<p class="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">Fehler</p>'
    );
  });

  it("rendert Erfolg, zusätzliche Klassen und div-Variante", () => {
    expect(renderToStaticMarkup(<Hinweis art="erfolg">Ok</Hinweis>)).toBe(
      '<p class="text-sm text-primary bg-primary-soft border border-primary/30 rounded-lg px-4 py-3">Ok</p>'
    );
    expect(
      renderToStaticMarkup(
        <Hinweis as="div" className="mb-5">
          x
        </Hinweis>
      )
    ).toBe(
      '<div class="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3 mb-5">x</div>'
    );
  });
});

describe("formatDatum", () => {
  it("formatiert als TT.MM.JJJJ", () => {
    expect(formatDatum("2026-03-05T12:00:00Z")).toBe("05.03.2026");
  });
});
