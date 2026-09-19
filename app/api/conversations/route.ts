import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { listConversations, createConversation, Section } from "@/lib/conversations";

const VALID_SECTIONS: Section[] = ["chat", "coding", "daily-life", "business"];

function parseSection(value: string | null): Section {
  return VALID_SECTIONS.includes(value as Section) ? (value as Section) : "chat";
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  const section = parseSection(req.nextUrl.searchParams.get("section"));

  try {
    const conversations = await listConversations(supabase, user.id, section);
    return Response.json({ conversations });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return new Response(JSON.stringify({ error: "Couldn't load conversations." }), {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const section = parseSection(body.section ?? null);
    const id = await createConversation(supabase, user.id, body.title, section);
    return Response.json({ id });
  } catch (err) {
    console.error("[POST /api/conversations]", err);
    return new Response(JSON.stringify({ error: "Couldn't create conversation." }), {
      status: 500,
    });
  }
}
