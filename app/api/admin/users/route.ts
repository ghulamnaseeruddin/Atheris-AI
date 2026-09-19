import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { isAdmin } = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json(
      { error: "Admin operations need SUPABASE_SERVICE_ROLE_KEY set on the server." },
      { status: 501 }
    );
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();

  let request = admin
    .from("profiles")
    .select("id, full_name, credits_remaining, is_admin, is_suspended, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (query) {
    request = request.ilike("full_name", `%${query}%`);
  }

  const { data, error } = await request;
  if (error) {
    return Response.json({ error: "Couldn't load users." }, { status: 500 });
  }

  return Response.json({ users: data ?? [] });
}
