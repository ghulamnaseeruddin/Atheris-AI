import { createClient } from "@supabase/supabase-js";

/**
 * Uses the service role key — NEVER import this into client components.
 * Only for privileged server-side operations (e.g. deleting a user account).
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set (Supabase Dashboard > Project
 * Settings > API > service_role key). Without it, admin-only actions will
 * fail gracefully with a clear error rather than crashing.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
