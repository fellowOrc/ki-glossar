"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, TermWithCategory } from "@/types/database";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function normalize(value: string) {
  return value
    .toLocaleLowerCase("de-DE")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function firstLetter(name: string) {
  const c = normalize(name).charAt(0).toUpperCase();
  return ALPHABET.includes(c) ? c : "#";
}

export function TermBrowser({
  terms,
  categories,
}: {
  terms: TermWithCategory[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return terms
      .filter((t) => (activeCategory ? t.category_id === activeCategory : true))
      .filter((t) => {
        if (!q) return true;
        return (
          normalize(t.name).includes(q) ||
          normalize(t.short_explanation ?? "").includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
  }, [terms, query, activeCategory]);

  const availableLetters = useMemo(
    () => new Set(filtered.map((t) => firstLetter(t.name))),
    [filtered]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, TermWithCategory[]>();
    for (const term of filtered) {
      const letter = firstLetter(term.name);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(term);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex-1 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Begriff suchen …"
            aria-label="Begriff suchen"
            className="field"
          />
        </div>
        <p className="text-sm text-muted whitespace-nowrap">
          {filtered.length === terms.length
            ? `${terms.length} Begriffe`
            : `${filtered.length} von ${terms.length} Begriffen`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={`chip ${activeCategory === null ? "chip-active" : ""}`}
        >
          Alle
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setActiveCategory(activeCategory === cat.id ? null : cat.id)
            }
            data-kat={cat.slug}
            className={`chip ${activeCategory === cat.id ? "chip-active" : ""}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="sticky top-16 z-30 bg-bg/95 backdrop-blur-sm border-y border-border mb-10 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-nowrap sm:flex-wrap gap-0.5 py-2.5 overflow-x-auto sm:overflow-visible">
          {[...ALPHABET, "#"].map((letter) => {
            const available = availableLetters.has(letter);
            return available ? (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-7 h-7 flex shrink-0 items-center justify-center text-sm font-medium rounded-md text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="w-7 h-7 flex shrink-0 items-center justify-center text-sm text-muted/35"
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-muted">
            Keine Begriffe gefunden. Versuche einen anderen Suchbegriff.
          </p>
          <Link
            href="/vorschlag"
            className="btn btn-secondary mt-5 inline-flex"
          >
            Diesen Begriff vorschlagen
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {[...ALPHABET, "#"]
            .filter((letter) => grouped.has(letter))
            .map((letter) => (
              <section
                key={letter}
                id={`letter-${letter}`}
                className="scroll-mt-32"
              >
                <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-3">
                  <span>{letter}</span>
                  <span
                    aria-hidden
                    className="flex-1 h-px bg-border"
                  />
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.get(letter)!.map((term) => (
                    <Link
                      key={term.id}
                      href={`/begriff/${term.slug}`}
                      data-kat={term.category?.slug ?? undefined}
                      className="card-link p-5 pl-6 flex flex-col gap-2 group"
                    >
                      <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                        {term.name}
                      </h3>
                      {term.category && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--kat, var(--muted))" }}
                        >
                          {term.category.name}
                        </span>
                      )}
                      {term.short_explanation && (
                        <p className="text-sm text-muted line-clamp-3 mt-1 leading-relaxed">
                          {term.short_explanation}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
