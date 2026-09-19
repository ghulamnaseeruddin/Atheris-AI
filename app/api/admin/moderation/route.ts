import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
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

  const { data, error } = await admin
    .from("generated_images")
    .select("id, user_id, prompt, image_data, created_at")
    .eq("flagged", true)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Couldn't load moderation queue." }, { status: 500 });
  }

  return Response.json({ items: data ?? [] });
}

export async function PATCH(req: NextRequest) {
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

  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") {
    return Response.json({ error: "Image id is required." }, { status: 400 });
  }

  // Resolving = clearing the flag (reviewed, no action needed).
  const { error } = await admin.from("generated_images").update({ flagged: false }).eq("id", id);
  if (error) {
    return Response.json({ error: "Couldn't resolve item." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
