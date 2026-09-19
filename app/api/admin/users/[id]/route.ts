import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.credits_remaining === "number") {
    updates.credits_remaining = body.credits_remaining;
  }
  if (typeof body.is_suspended === "boolean") {
    updates.is_suspended = body.is_suspended;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", params.id);
  if (error) {
    return Response.json({ error: "Couldn't update user." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
