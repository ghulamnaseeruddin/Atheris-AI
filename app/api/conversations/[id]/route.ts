import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getMessages, renameConversation, togglePinConversation, deleteConversation } from "@/lib/conversations";
import { moveConversationToFolder } from "@/lib/folders";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  try {
    const messages = await getMessages(supabase, params.id);
    return Response.json({ messages });
  } catch (err) {
    console.error("[GET /api/conversations/:id]", err);
    return new Response(JSON.stringify({ error: "Couldn't load messages." }), { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  try {
    const body = await req.json();
    if (typeof body.title === "string") {
      await renameConversation(supabase, params.id, body.title);
    }
    if (typeof body.pinned === "boolean") {
      await togglePinConversation(supabase, params.id, body.pinned);
    }
    if ("folder_id" in body) {
      await moveConversationToFolder(supabase, params.id, body.folder_id);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/conversations/:id]", err);
    return new Response(JSON.stringify({ error: "Couldn't update conversation." }), {
      status: 500,
    });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  try {
    await deleteConversation(supabase, params.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/conversations/:id]", err);
    return new Response(JSON.stringify({ error: "Couldn't delete conversation." }), {
      status: 500,
    });
  }
}
