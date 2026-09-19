import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { listTemplates, createTemplate } from "@/lib/templates";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const templates = await listTemplates(supabase, user.id);
    return Response.json({ templates });
  } catch {
    return Response.json({ error: "Couldn't load templates." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { title, content } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "Title and content are required." }, { status: 400 });
  }

  try {
    const template = await createTemplate(supabase, user.id, title.trim(), content.trim());
    return Response.json({ template });
  } catch {
    return Response.json({ error: "Couldn't save template." }, { status: 500 });
  }
}
