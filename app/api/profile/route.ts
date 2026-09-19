import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FREE_MONTHLY_CREDITS } from "@/lib/credits";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, credits_remaining, credits_reset_at, created_at, referral_code, is_admin")
    .eq("id", user.id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: "Couldn't load profile." }), { status: 500 });
  }

  return Response.json({
    profile: {
      ...profile,
      email: user.email,
      credits_total: FREE_MONTHLY_CREDITS,
      auth_providers: user.app_metadata?.providers ?? [user.app_metadata?.provider],
    },
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, string> = {};
  if (typeof body.full_name === "string") updates.full_name = body.full_name;
  if (typeof body.avatar_url === "string") updates.avatar_url = body.avatar_url;

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: "No valid fields to update." }), { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

  if (error) {
    return new Response(JSON.stringify({ error: "Couldn't update profile." }), { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(
      JSON.stringify({
        error:
          "Account deletion isn't configured yet — add SUPABASE_SERVICE_ROLE_KEY to your environment.",
      }),
      { status: 501 }
    );
  }

  // Deletes the auth user; `profiles`/`conversations`/`messages` cascade via FK.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: "Couldn't delete account." }), { status: 500 });
  }

  return Response.json({ ok: true });
}
