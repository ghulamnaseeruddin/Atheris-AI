import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { shared } = await req.json().catch(() => ({ shared: true }));

  if (shared) {
    const slug = randomBytes(6).toString("hex");
    const { error } = await supabase
      .from("conversations")
      .update({ shared: true, share_slug: slug })
      .eq("id", params.id)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: "Couldn't create share link." }, { status: 500 });
    return Response.json({ slug });
  } else {
    const { error } = await supabase
      .from("conversations")
      .update({ shared: false })
      .eq("id", params.id)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: "Couldn't disable sharing." }, { status: 500 });
    return Response.json({ ok: true });
  }
}
