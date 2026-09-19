import { SupabaseClient } from "@supabase/supabase-js";

export interface Folder {
  id: string;
  name: string;
}

export async function listFolders(supabase: SupabaseClient, userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<Folder> {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFolder(supabase: SupabaseClient, folderId: string) {
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw error;
}

export async function moveConversationToFolder(
  supabase: SupabaseClient,
  conversationId: string,
  folderId: string | null
) {
  const { error } = await supabase
    .from("conversations")
    .update({ folder_id: folderId })
    .eq("id", conversationId);
  if (error) throw error;
}
