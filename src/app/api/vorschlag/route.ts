import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Dieser Endpunkt steht offen im Netz. Honigtopf-Feld und Mindestverweildauer
// halten einfache Bots ab. Die eigentliche Mengenbegrenzung sitzt als Trigger
// in der Datenbank: hier waere sie wirkungslos (anonyme Besucher duerfen die
// Tabelle nicht lesen) und umgehbar, indem jemand das Formular ueberspringt.

function hashAbsender(request: Request): string | null {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim();
  if (!forwarded) return null;
  return createHash("sha256")
    .update(`ki-glossar:${forwarded}`)
    .digest("hex")
    .slice(0, 32);
}

export async function POST(request: Request) {
  let body: {
    termName?: string;
    note?: string;
    contactEmail?: string;
    website?: string;
    startedAt?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (body.website && body.website.trim() !== "") {
    return Response.json({ ok: true });
  }

  if (
    typeof body.startedAt === "number" &&
    Date.now() - body.startedAt < 2000
  ) {
    return Response.json({ ok: true });
  }

  const termName = body.termName?.trim() ?? "";
  const note = body.note?.trim() ?? "";
  const contactEmail = body.contactEmail?.trim() ?? "";

  if (termName.length < 2 || termName.length > 120) {
    return Response.json(
      { error: "Bitte gib einen Begriff mit 2 bis 120 Zeichen ein." },
      { status: 400 }
    );
  }
  if (note.length > 1000) {
    return Response.json(
      { error: "Die Anmerkung ist zu lang (maximal 1000 Zeichen)." },
      { status: 400 }
    );
  }
  if (contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return Response.json(
      { error: "Die E-Mail-Adresse sieht nicht gültig aus." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const ipHash = hashAbsender(request);

  const { error } = await supabase.from("suggestions").insert({
    term_name: termName,
    note: note || null,
    contact_email: contactEmail || null,
    ip_hash: ipHash,
  });

  if (error) {
    if (error.code === "23514" || /zu viele/i.test(error.message)) {
      return Response.json(
        {
          error:
            "Es sind gerade sehr viele Vorschläge eingegangen. Bitte versuche es in einer Stunde noch einmal.",
        },
        { status: 429 }
      );
    }
    console.error("Vorschlag konnte nicht gespeichert werden:", error.message);
    return Response.json(
      {
        error:
          "Der Vorschlag konnte gerade nicht gespeichert werden. Bitte versuche es später noch einmal.",
      },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
