"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ki-glossar:theme";
const CHANGED_EVENT = "ki-glossar:theme-geaendert";

type Theme = "hell" | "dunkel" | "system";

// Der Zustand liegt im DOM (data-theme am <html>), weil ihn ein Inline-Skript
// schon vor dem ersten Rendern setzt. useSyncExternalStore ist der von React
// vorgesehene Weg, so etwas anzubinden.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  const gesetzt = document.documentElement.dataset.theme;
  return gesetzt === "dark" ? "dunkel" : gesetzt === "light" ? "hell" : "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

function anwenden(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme === "dunkel" ? "dark" : "light";
  }
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme === "dunkel" ? "dark" : "light");
  } catch {
      // bewusst ignoriert
    }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const umschalten = useCallback(() => {
    if (theme === "system") {
      const systemIstDunkel = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      anwenden(systemIstDunkel ? "hell" : "dunkel");
      return;
    }
    anwenden(theme === "dunkel" ? "hell" : "dunkel");
  }, [theme]);

  const zeigtDunkel = theme === "dunkel";
  const beschriftung =
    theme === "system"
      ? "Farbschema wechseln (folgt gerade dem System)"
      : zeigtDunkel
        ? "Zu hellem Farbschema wechseln"
        : "Zu dunklem Farbschema wechseln";

  return (
    <button
      type="button"
      onClick={umschalten}
      title={beschriftung}
      aria-label={beschriftung}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-primary hover:border-primary transition-colors"
    >
      {zeigtDunkel ? (
        <svg
          aria-hidden
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg
          aria-hidden
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
