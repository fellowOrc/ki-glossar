import { createClient } from "@/lib/supabase/server";
import type { Rolle as DbRolle } from "@/types/database";

// Zu den Rollen aus der Datenbank kommt "gast" für nicht angemeldete Besucher.
export type Rolle = "gast" | DbRolle;

// Massgeblich ist immer die Datenbank. Die Rolle steuert hier nur die Anzeige;
// durchgesetzt wird sie von den RLS-Policies in Supabase.
export async function getRolle(): Promise<{
  rolle: Rolle;
  userId: string | null;
  istRedaktion: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rolle: "gast", userId: null, istRedaktion: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const rolle = (profile?.role as Rolle | undefined) ?? "member";
  return {
    rolle,
    userId: user.id,
    istRedaktion: rolle === "editor" || rolle === "admin",
  };
}
