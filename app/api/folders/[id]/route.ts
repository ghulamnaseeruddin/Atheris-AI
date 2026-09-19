import { createSupabaseServerClient } from "@/lib/supabase-server";
import { deleteFolder } from "@/lib/folders";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  try {
    await deleteFolder(supabase, params.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't delete folder." }, { status: 500 });
  }
}
