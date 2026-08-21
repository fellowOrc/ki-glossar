import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-soft mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="font-semibold text-sm">KI-Glossar für den Mittelstand</p>
          <p className="text-sm text-muted mt-1">
            Ein Nachschlagewerk für KI-Begriffe, verständlich erklärt.
          </p>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm">
          <Link
            href="/vorschlag"
            className="text-muted hover:text-primary transition-colors"
          >
            Begriff vorschlagen
          </Link>
          <Link
            href="/impressum"
            className="text-muted hover:text-primary transition-colors"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="text-muted hover:text-primary transition-colors"
          >
            Datenschutz
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-8">
        <p className="text-xs text-muted">
          &copy; {new Date().getFullYear()} KI-Glossar für den Mittelstand
        </p>
      </div>
    </footer>
  );
}
