import { SupabaseClient } from "@supabase/supabase-js";

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
}

export async function listTemplates(
  supabase: SupabaseClient,
  userId: string
): Promise<PromptTemplate[]> {
  const { data, error } = await supabase
    .from("prompt_templates")
    .select("id, title, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  content: string
): Promise<PromptTemplate> {
  const { data, error } = await supabase
    .from("prompt_templates")
    .insert({ user_id: userId, title, content })
    .select("id, title, content")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("prompt_templates").delete().eq("id", id);
  if (error) throw error;
}
