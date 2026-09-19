import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

// Any signed-in user can read active announcements (RLS enforces "active only").
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("announcements")
    .select("id, message, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    return Response.json({ error: "Couldn't load announcements." }, { status: 500 });
  }

  return Response.json({ announcements: data ?? [] });
}

export async function POST(req: NextRequest) {
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

  const { message } = await req.json().catch(() => ({}));
  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const { error } = await admin.from("announcements").insert({
    message: message.trim(),
    created_by: user.id,
  });

  if (error) {
    return Response.json({ error: "Couldn't create announcement." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
