import { createSupabaseServerClient } from "@/lib/supabase-server";
import { deleteTemplate } from "@/lib/templates";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  try {
    await deleteTemplate(supabase, params.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't delete template." }, { status: 500 });
  }
}
