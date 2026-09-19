import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { listFolders, createFolder } from "@/lib/folders";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const folders = await listFolders(supabase, user.id);
    return Response.json({ folders });
  } catch {
    return Response.json({ error: "Couldn't load folders." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Folder name is required." }, { status: 400 });
  }

  try {
    const folder = await createFolder(supabase, user.id, name.trim());
    return Response.json({ folder });
  } catch {
    return Response.json({ error: "Couldn't create folder." }, { status: 500 });
  }
}
