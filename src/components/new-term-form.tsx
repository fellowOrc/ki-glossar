"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setAiBusy } from "@/lib/ai-busy";
import {
  TermFields,
  emptySource,
  leererEntwurf,
  type SourceRow,
  type TermDraft,
} from "@/components/term-fields";
import type { Category, Term } from "@/types/database";

type Step = "input" | "generating" | "review";

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
      // bewusst ignoriert
    }
  window.dispatchEvent(new Event(DRAFT_CHANGED_EVENT));
}

type Verdict = {
  topic: "ki_bezug" | "unklar" | "themenfremd";
  concern: "keine" | "pruefen" | "erheblich";
  reasoning: string;
};

export function NewTermForm({
  categories,
  existingTerms,
  vorbelegterBegriff = "",
  vorschlagId = null,
}: {
  categories: Category[];
  existingTerms: Pick<Term, "id" | "slug" | "name">[];
  vorbelegterBegriff?: string;
  vorschlagId?: string | null;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("input");
  const [keyword, setKeyword] = useState(vorbelegterBegriff);

  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [draft, setDraft] = useState<TermDraft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const storedDraftJson = useSyncExternalStore(
    subscribeToStoredDraft,
    readStoredDraft,
    storedDraftServerSnapshot
  );

  const recoverableDraft = useMemo(() => {
    if (!storedDraftJson) return null;
    try {
      const parsed = JSON.parse(storedDraftJson) as TermDraft;
      return parsed && typeof parsed.name === "string" ? parsed : null;
    } catch {
      return null;
    }
  }, [storedDraftJson]);

  useEffect(() => {
    if (step !== "review" || !draft) return;
    writeStoredDraft(JSON.stringify(draft));
  }, [draft, step]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      setAiBusy(false);
    };
  }, []);

  const clearStoredDraft = useCallback(() => {
    writeStoredDraft(null);
  }, []);

  function updateDraft(patch: Partial<TermDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function startManual() {
    setAiError(null);
    setAiNotes([]);
    setDraft(leererEntwurf(categories, keyword.trim()));
    setStep("review");
  }

  async function handleGenerate() {
    const name = keyword.trim();
    if (!name) {
      setAiError("Bitte zuerst einen Begriff eingeben.");
      return;
    }

    setAiError(null);
    setAiNotes([]);
    setProgress(0.02);
    setPhaseLabel("Verbindung wird aufgebaut …");
    setStep("generating");
    setAiBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai-entwurf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message =
          "Der KI-Entwurf konnte nicht gestartet werden. Bitte erneut versuchen.";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
      // bewusst ignoriert
    }
        setAiError(message);
        setStep("input");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: {
            type: string;
            label?: string;
            progress?: number;
            error?: string;
            notes?: string[];
            draft?: {
              name: string;
              slug: string;
              categoryId: string | null;
              shortExplanation: string;
              definition: string;
              businessRelevance: string;
              sources: SourceRow[];
              relatedTermIds: string[];
            };
          };
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }

          if (event.type === "phase") {
            if (typeof event.progress === "number") {
              setProgress((prev) => Math.max(prev, event.progress!));
            }
            if (event.label) setPhaseLabel(event.label);
          } else if (event.type === "error") {
            setAiError(
              event.error ?? "Der KI-Entwurf konnte nicht erstellt werden."
            );
            setStep("input");
            finished = true;
          } else if (event.type === "result" && event.draft) {
            const d = event.draft;
            setDraft({
              name: d.name,
              slug: d.slug,
              categoryId: d.categoryId ?? categories[0]?.id ?? "",
              shortExplanation: d.shortExplanation,
              definition: d.definition,
              businessRelevance: d.businessRelevance,
              sources: d.sources.length > 0 ? d.sources : [{ ...emptySource }],
              relatedIds: d.relatedTermIds,
            });
            setAiNotes(event.notes ?? []);
            setSlugTouched(true);
            setStep("review");
            finished = true;
          }
        }
      }

      if (!finished) {
        setAiError(
          "Die Verbindung wurde unerwartet beendet. Bitte erneut versuchen."
        );
        setStep("input");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setStep("input");
        return;
      }
      setAiError(
        err instanceof Error
          ? err.message
          : "Der KI-Entwurf konnte nicht erstellt werden."
      );
      setStep("input");
    } finally {
      setAiBusy(false);
      abortRef.current = null;
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
    setAiBusy(false);
    setStep("input");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;

    if (!draft.name.trim() || !draft.slug.trim()) {
      setSubmitError("Begriff und URL-Slug sind erforderlich.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);

    setChecking(true);
    try {
      const res = await fetch("/api/pruefung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          shortExplanation: draft.shortExplanation,
          definition: draft.definition,
          businessRelevance: draft.businessRelevance,
        }),
      });
      const data = await res.json();
      if (res.ok && data.verdict) setVerdict(data.verdict as Verdict);
    } catch {
      // bewusst ignoriert
    } finally {
      setChecking(false);
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitError(
        "Deine Sitzung ist abgelaufen. Der Entwurf bleibt erhalten – bitte in einem neuen Tab anmelden und erneut speichern."
      );
      setSubmitLoading(false);
      return;
    }

    const { data: term, error: termError } = await supabase
      .from("terms")
      .insert({
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        category_id: draft.categoryId || null,
        short_explanation: draft.shortExplanation.trim() || null,
        definition: draft.definition.trim() || null,
        business_relevance: draft.businessRelevance.trim() || null,
        status: "published",
        created_by: user.id,
      })
      .select()
      .single();

    if (termError || !term) {
      setSubmitError(
        termError?.message.includes("duplicate")
          ? "Ein Begriff mit diesem Slug existiert bereits. Bitte den Slug anpassen."
          : termError?.message ?? "Begriff konnte nicht gespeichert werden."
      );
      setSubmitLoading(false);
      return;
    }

    const validSources = draft.sources.filter((s) => s.title.trim());
    if (validSources.length > 0) {
      await supabase.from("sources").insert(
        validSources.map((s) => ({
          term_id: term.id,
          title: s.title.trim(),
          authors: s.authors.trim() || null,
          publisher: s.publisher.trim() || null,
          year: s.year ? parseInt(s.year, 10) : null,
          url: s.url.trim() || null,
        }))
      );
    }

    if (draft.relatedIds.length > 0) {
      await supabase.from("term_relations").insert(
        draft.relatedIds.flatMap((relatedId) => [
          { term_id: term.id, related_term_id: relatedId },
          { term_id: relatedId, related_term_id: term.id },
        ])
      );
    }

    if (vorschlagId) {
      await supabase
        .from("suggestions")
        .update({
          status: "uebernommen",
          handled_at: new Date().toISOString(),
          handled_by: user.id,
        })
        .eq("id", vorschlagId);
    }

    clearStoredDraft();
    setSubmitLoading(false);
    router.push(`/begriff/${term.slug}`);
    router.refresh();
  }

  if (step === "input") {
    return (
      <div className="flex flex-col gap-6">
        {recoverableDraft && (
          <div className="panel p-5 flex flex-col gap-3">
            <div>
              <p className="eyebrow mb-1">Nicht gespeicherter Entwurf gefunden</p>
              <p className="text-sm text-muted">
                Für „{recoverableDraft.name || "ohne Titel"}&#8220; liegt noch
                ein unbestätigter Entwurf aus dieser Browsersitzung vor.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraft(recoverableDraft);
                  setSlugTouched(true);
                  setStep("review");
                }}
                className="btn btn-primary"
              >
                Entwurf weiterbearbeiten
              </button>
              <button
                type="button"
                onClick={clearStoredDraft}
                className="btn btn-quiet"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        <div className="panel p-6 flex flex-col gap-4">
          <h2 className="eyebrow">Schritt 1 von 3 · Begriff</h2>
          <p className="text-sm text-muted leading-relaxed">
            Gib nur den Begriff ein. Die KI recherchiert ihn im Web und füllt
            Kategorie, Kurzerklärung, Definition, Relevanz, Quellen und
            verwandte Begriffe aus. Den Entwurf bekommst du danach zur
            Kontrolle vorgelegt.
          </p>

          <label className="flex flex-col gap-2">
            <span className="font-medium text-sm">Begriff *</span>
            <input
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="z. B. Retrieval Augmented Generation"
              className="field"
            />
          </label>

          {aiError && (
            <div className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
              <p>{aiError}</p>
              <button
                type="button"
                onClick={startManual}
                className="mt-2 underline hover:no-underline font-medium"
              >
                Begriff stattdessen manuell anlegen
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="btn btn-primary"
            >
              ✦ Entwurf von der KI erstellen lassen
            </button>
            <button
              type="button"
              onClick={startManual}
              className="btn btn-quiet"
            >
              Ohne KI manuell anlegen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    const percent = Math.round(progress * 100);
    return (
      <div className="panel p-6 flex flex-col gap-5">
        <h2 className="eyebrow">Schritt 2 von 3 · Recherche läuft</h2>

        <div>
          <p className="font-semibold mb-1">{keyword}</p>
          <p className="text-sm text-muted" aria-live="polite">
            {phaseLabel}
          </p>
        </div>

        <div>
          <div
            className="h-2.5 w-full rounded-full bg-surface-soft border border-border overflow-hidden"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fortschritt der KI-Recherche"
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-muted mt-2">{percent} %</p>
        </div>

        <p className="text-sm text-muted">
          Die Websuche dauert je nach Begriff etwa 30 bis 60 Sekunden. Solange
          die Recherche läuft, wirst du nicht automatisch abgemeldet.
        </p>

        <button
          type="button"
          onClick={cancelGeneration}
          className="btn btn-quiet self-start"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="panel p-5">
        <h2 className="eyebrow mb-1">Schritt 3 von 3 · Entwurf prüfen</h2>
        <p className="text-sm text-muted">
          Alles ist frei änderbar. Mit „Veröffentlichen&#8220; wird der Begriff
          sofort im Glossar sichtbar.
        </p>
      </div>

      {verdict && (
        <div className="panel p-5 flex flex-col gap-2">
          <h3 className="eyebrow">Automatische Einschätzung</h3>
          <p className="text-sm text-muted">{verdict.reasoning}</p>
          <p className="text-sm text-muted">
            Thema: {verdict.topic.replace("_", "-")} · Bedenken:{" "}
            {verdict.concern}
          </p>
        </div>
      )}

      {aiNotes.length > 0 && (
        <div className="panel p-5 flex flex-col gap-2">
          <h3 className="eyebrow" style={{ color: "var(--danger)" }}>
            Bitte besonders prüfen
          </h3>
          <ul className="text-sm text-muted flex flex-col gap-1 list-disc pl-5">
            {aiNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <TermFields
        draft={draft}
        onChange={updateDraft}
        categories={categories}
        existingTerms={existingTerms}
        slugTouched={slugTouched}
        onSlugTouched={() => setSlugTouched(true)}
      />

      {submitError && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitLoading}
          className="btn btn-primary"
        >
          {submitLoading
            ? checking
              ? "Prüfe …"
              : "Speichere …"
            : "Veröffentlichen"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearStoredDraft();
            setDraft(null);
            setAiNotes([]);
            setVerdict(null);
            setSlugTouched(false);
            setStep("input");
          }}
          className="btn btn-quiet"
        >
          Entwurf verwerfen und neu beginnen
        </button>
      </div>
    </form>
  );
}
