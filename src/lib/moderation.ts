// Ergebnis der automatischen redaktionellen Vorprüfung (/api/pruefung).
// Wird von der Route erzeugt und von den Formularen angezeigt.
export type ModerationVerdict = {
  topic: "ki_bezug" | "unklar" | "themenfremd";
  concern: "keine" | "pruefen" | "erheblich";
  reasoning: string;
};
