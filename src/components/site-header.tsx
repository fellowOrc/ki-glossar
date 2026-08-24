import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRolle } from "@/lib/rollen";
import { HeaderNav } from "@/components/header-nav";

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

          <HeaderNav eingeloggt={!!user} istRedaktion={istRedaktion} />
        </div>
      </div>
    </header>
  );
}
