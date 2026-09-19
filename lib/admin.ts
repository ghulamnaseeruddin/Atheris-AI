import { SupabaseClient } from "@supabase/supabase-js";

export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<{ isAdmin: boolean }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (error || !data) return { isAdmin: false };
  return { isAdmin: !!data.is_admin };
}
