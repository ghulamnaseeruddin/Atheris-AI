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

  const [{ count: userCount }, { count: conversationCount }, { count: messageCount }, { count: imageCount }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("conversations").select("*", { count: "exact", head: true }),
      admin.from("messages").select("*", { count: "exact", head: true }),
      admin.from("generated_images").select("*", { count: "exact", head: true }),
    ]);

  const { data: creditData } = await admin.from("profiles").select("credits_remaining");
  const totalCreditsRemaining = (creditData ?? []).reduce(
    (sum, p) => sum + (p.credits_remaining ?? 0),
    0
  );

  return Response.json({
    stats: {
      userCount: userCount ?? 0,
      conversationCount: conversationCount ?? 0,
      messageCount: messageCount ?? 0,
      imageCount: imageCount ?? 0,
      totalCreditsRemaining,
    },
  });
}
