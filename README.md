# KI-Glossar für den Mittelstand

Interaktives Nachschlagewerk für KI-Begriffe, verständlich erklärt für kleine
und mittlere Unternehmen. Live unter https://ki-glossar-mittelstand.vercel.app

## Technik

- Next.js 16 (App Router) mit Tailwind CSS v4
- Supabase als Datenbank und für die Anmeldung der Redaktion
- Anthropic API für Begriffsrecherche (mit Websuche) und redaktionelle Vorprüfung

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `ANTHROPIC_API_KEY` | KI-Recherche und Vorprüfung. Fehlt er, degradieren beide Funktionen kontrolliert. |
| `NEXT_PUBLIC_SUPABASE_URL` | optional, sonst greift der Fallback in `src/lib/supabase/config.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional, sonst greift der Fallback |

## Rollen und Rechte

Öffentliche Registrierung gibt es nicht. Besucher können unter `/vorschlag`
ohne Konto Begriffe vorschlagen; die Redaktion prüft sie unter `/redaktion`.
Wer was darf, wird von den RLS-Policies in Supabase durchgesetzt, nicht von
der Oberfläche.

## Entwicklung

```bash
npm install
npm run dev
npm run check   # Typprüfung, Lint und Tests in einem Durchgang
```

## Aufbau

| Ort | Inhalt |
|---|---|
| `src/app/` | Seiten und API-Routen (App Router) |
| `src/components/` | React-Komponenten |
| `src/hooks/` | eigene React-Hooks |
| `src/lib/` | reine Logik ohne UI, mit Tests daneben (`*.test.ts`) |
| `src/lib/ai-entwurf/` | Prompt, Auswertung und Fortschritt des KI-Entwurfs |
| `src/lib/server/` | Helfer, die nur auf dem Server laufen |
| `src/proxy.ts` | frischt die Supabase-Sitzung auf (früher `middleware.ts`) |

Die Tests (Vitest) prüfen die reine Logik: Quiz-Schwärzung, Auswertung des
KI-Entwurfs, Speicher-Mapping, Stream-Leser. Sie brauchen weder Datenbank
noch Netz.
