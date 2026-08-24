import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { IdleLogout } from "@/components/idle-logout";
import { getRolle } from "@/lib/rollen";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { istRedaktion } = await getRolle();

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm tracking-tight"
            >
              KI
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-semibold text-base group-hover:text-primary transition-colors">
                KI-Glossar
              </span>
              <span className="text-[11px] text-muted">
                für den Mittelstand
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {user ? (
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
                Neuen Begriff vorschlagen
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
