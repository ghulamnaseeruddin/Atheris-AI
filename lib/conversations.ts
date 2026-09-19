import { SupabaseClient } from "@supabase/supabase-js";
import { ChatMessage } from "./ai-router";

export type Section = "chat" | "coding" | "daily-life" | "business";

export interface ConversationSummary {
  id: string;
  title: string;
  pinned: boolean;
  updated_at: string;
  folder_id: string | null;
  shared: boolean;
  share_slug: string | null;
  section: Section;
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
  section: Section = "chat"
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, pinned, updated_at, folder_id, shared, share_slug, section")
    .eq("user_id", userId)
    .eq("section", section)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  title = "New chat",
  section: Section = "chat"
): Promise<string> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title, section })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function renameConversation(
  supabase: SupabaseClient,
  conversationId: string,
  title: string
) {
  const { error } = await supabase
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function togglePinConversation(
  supabase: SupabaseClient,
  conversationId: string,
  pinned: boolean
) {
  const { error } = await supabase
    .from("conversations")
    .update({ pinned })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function deleteConversation(supabase: SupabaseClient, conversationId: string) {
  const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
  if (error) throw error;
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, images")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((m) => ({
    role: m.role,
    content: m.content,
    images: m.images ?? undefined,
  })) as ChatMessage[];
}

export async function appendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: ChatMessage["role"],
  content: string,
  model?: string,
  images?: string[]
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    model,
    images: images && images.length > 0 ? images : null,
  });
  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

/** Derives a short title from the first user message. */
export function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? trimmed.slice(0, 48) + "…" : trimmed || "New chat";
}
