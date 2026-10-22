"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { TermDraft } from "@/lib/term-draft";

// Hält einen noch nicht veröffentlichten Entwurf in der sessionStorage, damit
// er eine Abmeldung wegen Inaktivität oder ein versehentliches Neuladen
// übersteht. Ein eigenes Ereignis informiert andere Komponenten im selben
// Tab, das storage-Ereignis andere Tabs.

const DRAFT_STORAGE_KEY = "ki-glossar:entwurf";
const DRAFT_CHANGED_EVENT = "ki-glossar:entwurf-geaendert";

function subscribeToStoredDraft(onChange: () => void) {
  window.addEventListener(DRAFT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DRAFT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredDraft(): string | null {
  try {
    return sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storedDraftServerSnapshot(): string | null {
  return null;
}

function writeStoredDraft(value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    else sessionStorage.setItem(DRAFT_STORAGE_KEY, value);
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – dann eben ohne.
  }
  window.dispatchEvent(new Event(DRAFT_CHANGED_EVENT));
}

export function useGespeicherterEntwurf() {
  const storedDraftJson = useSyncExternalStore(
    subscribeToStoredDraft,
    readStoredDraft,
    storedDraftServerSnapshot
  );

  // Der wiederherstellbare Entwurf – oder null, wenn keiner (lesbar) da ist.
  const wiederherstellbar = useMemo(() => {
    if (!storedDraftJson) return null;
    try {
      const parsed = JSON.parse(storedDraftJson) as TermDraft;
      return parsed && typeof parsed.name === "string" ? parsed : null;
    } catch {
      return null;
    }
  }, [storedDraftJson]);

  const speichern = useCallback((draft: TermDraft) => {
    writeStoredDraft(JSON.stringify(draft));
  }, []);

  const verwerfen = useCallback(() => {
    writeStoredDraft(null);
  }, []);

  return { wiederherstellbar, speichern, verwerfen };
}
