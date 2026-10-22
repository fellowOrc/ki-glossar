import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Frischt bei jeder Anfrage die Supabase-Sitzung auf (Cookies). Seit Next.js 16
// heißt diese Datei proxy.ts statt middleware.ts. Sie muss neben dem
// app-Ordner liegen, hier also in src/ – im Projektwurzelverzeichnis wird sie
// nicht erkannt.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
