// Gemeinsame Typen für /api/ai-entwurf und das Formular „Neuer Begriff“.
// Die Route schickt die Ereignisse als NDJSON (ein JSON-Objekt pro Zeile).

export type EntwurfQuelle = {
  title: string;
  authors: string;
  publisher: string;
  year: string;
  url: string;
};

export type DraftPayload = {
  name: string;
  slug: string;
  slugTaken: boolean;
  categoryId: string | null;
  shortExplanation: string;
  definition: string;
  businessRelevance: string;
  sources: EntwurfQuelle[];
  relatedTermIds: string[];
};

export type ProgressEvent =
  | { type: "phase"; label: string; progress: number }
  | { type: "result"; draft: DraftPayload; notes: string[] }
  | { type: "error"; error: string };

// So kommt ein Ereignis beim Client an: ungeprüftes JSON, bei dem jedes Feld
// fehlen kann. Der Client prüft daher jedes Feld, bevor er es nutzt.
export type EmpfangenesEreignis = {
  type?: string;
  label?: string;
  progress?: number;
  error?: string;
  notes?: string[];
  draft?: DraftPayload;
};
