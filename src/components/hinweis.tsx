import type { ReactNode } from "react";

// Einheitlicher Meldungskasten für Fehler- und Erfolgsmeldungen in Formularen.
const STIL = {
  fehler: "text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3",
  erfolg: "text-sm text-primary bg-primary-soft border border-primary/30 rounded-lg px-4 py-3",
} as const;

export function Hinweis({
  art = "fehler",
  as: Element = "p",
  className,
  children,
}: {
  art?: keyof typeof STIL;
  // "div", wenn der Kasten selbst Absätze oder Schaltflächen enthält.
  as?: "p" | "div";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Element className={className ? `${STIL[art]} ${className}` : STIL[art]}>
      {children}
    </Element>
  );
}
