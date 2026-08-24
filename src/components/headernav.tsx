"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { IdleLogout } from "@/components/idle-logout";

// Ab der md-Breakpoint (768px) ist genug Platz für die volle Navigation in
// einer Zeile. Darunter verschwindet sie hinter einem Menü-Button, damit
// nichts mehr umbricht oder aus der Kopfzeile herausragt (siehe Screenshot:
// vorher lief "Teste dein Wissen" auf schmalen Bildschirmen dreizeilig um).
export function HeaderNav({
  eingeloggt,
  istRedaktion,
}: {
  eingeloggt: boolean;
  istRedaktion: boolean;
}) {
  const [offen, setOffen] = useState(false);

  // Menü schließen, wenn per Tastatur (Escape) oder durch Vergrößern des
  // Fensters über die Mobile-Breite hinaus navigiert wird.
  useEffect(() => {
    if (!offen) return;
    const schliessenPerEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    window.addEventListener("keydown", schliessenPerEsc);
    return () => window.removeEventListener("keydown", schliessenPerEsc);
  }, [offen]);

  return (
    <>
      {/* Volle Navigation ab md */}
      <nav className="hidden md:flex items-center gap-2 sm:gap-3">
        <Link href="/quiz" className="btn btn-secondary">
          Teste dein Wissen
        </Link>
        <ThemeToggle />

        {eingeloggt ? (
          <>
            {istRedaktion && (
              <Link
                href="/redaktion"
                className="text-sm text-muted hover:text-foreground transition-colors px-2 py-1"
              >
                Redaktion
              </Link>
            )}
            <Link href="/neuer-begriff" className="btn btn-secondary">
              Neuer Begriff
            </Link>
            <LogoutButton />
            <IdleLogout />
          </>
        ) : (
          <Link href="/vorschlag" className="btn btn-primary">
            Begriff vorschlagen
          </Link>
        )}
      </nav>

      {/* Mobil: Farbschema bleibt griffbereit, Rest hinter Menü-Button */}
      <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          aria-controls="mobiles-menue"
          aria-label={offen ? "Menü schließen" : "Menü öffnen"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-primary hover:border-primary transition-colors"
        >
          {offen ? (
            <svg aria-hidden width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path
                d="M1 1L17 17M17 1L1 17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg aria-hidden width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path
                d="M0 1H18M0 7H18M0 13H18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {offen && (
        <>
          {/* Abdunkelung: Klick daneben schließt das Menü */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOffen(false)}
            className="md:hidden fixed inset-x-0 top-16 bottom-0 z-20 bg-fg/30 cursor-default"
          />
          <div
            id="mobiles-menue"
            className="md:hidden fixed inset-x-0 top-16 z-30 border-b border-border bg-surface px-4 py-4 flex flex-col gap-2 shadow-lift"
          >
            <Link
              href="/quiz"
              onClick={() => setOffen(false)}
              className="btn btn-secondary w-full"
            >
              Teste dein Wissen
            </Link>

            {eingeloggt ? (
              <>
                {istRedaktion && (
                  <Link
                    href="/redaktion"
                    onClick={() => setOffen(false)}
                    className="px-2 py-2 text-sm font-medium text-foreground"
                  >
                    Redaktion
                  </Link>
                )}
                <Link
                  href="/neuer-begriff"
                  onClick={() => setOffen(false)}
                  className="btn btn-secondary w-full"
                >
                  Neuer Begriff
                </Link>
                <div className="flex justify-start">
                  <LogoutButton />
                </div>
                <IdleLogout />
              </>
            ) : (
              <Link
                href="/vorschlag"
                onClick={() => setOffen(false)}
                className="btn btn-primary w-full"
              >
                Begriff vorschlagen
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
