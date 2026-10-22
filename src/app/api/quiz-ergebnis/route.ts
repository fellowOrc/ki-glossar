import { createClient } from "@/lib/supabase/server";
import { ABSENDER_PRAEFIX, hashAbsender } from "@/lib/server/absender";
import { istMengenbegrenzung } from "@/lib/server/datenbank-fehler";

export const dynamic = "force-dynamic";

// Nimmt das Ergebnis eines abgeschlossenen Quizdurchlaufs entgegen und gibt
// die Einordnung gegenüber allen bisherigen Durchläufen zurück. Gespeichert
// wird nur, wie viele von wie vielen Fragen richtig waren – keine Angabe dazu,
// welche Fragen gestellt wurden oder wer gespielt hat.
//
// Die Tabelle selbst ist für anonyme Besucher gesperrt. Schreiben und Rechnen
// übernimmt die Datenbankfunktion quiz_ergebnis_auswerten; die Mengen-
// begrenzung sitzt als Trigger daneben, weil sie hier umgehbar wäre.

export async function POST(request: Request) {
  let body: { richtige?: unknown; gesamt?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const richtige = Number(body.richtige);
  const gesamt = Number(body.gesamt);

  if (
    !Number.isInteger(richtige) ||
    !Number.isInteger(gesamt) ||
    gesamt < 1 ||
    gesamt > 100 ||
    richtige < 0 ||
    richtige > gesamt
  ) {
    return Response.json({ error: "Ungültiges Ergebnis." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("quiz_ergebnis_auswerten", {
    p_richtige: richtige,
    p_gesamt: gesamt,
    p_ip_hash: hashAbsender(request, ABSENDER_PRAEFIX.quiz),
  });

  if (error) {
    if (istMengenbegrenzung(error)) {
      return Response.json(
        {
          error:
            "Es wurden gerade sehr viele Durchläufe gespeichert. Der Vergleich mit allen Teilnehmern fehlt deshalb diesmal.",
        },
        { status: 429 }
      );
    }
    console.error("Quizergebnis konnte nicht gespeichert werden:", error.message);
    return Response.json(
      {
        error:
          "Der Vergleich mit allen Teilnehmern ist gerade nicht verfügbar.",
      },
      { status: 500 }
    );
  }

  return Response.json(data);
}
