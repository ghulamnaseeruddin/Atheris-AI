import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("share_slug", params.slug)
    .eq("shared", true)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Atheris AI" className="h-6 w-6 rounded-full" />
          <span className="font-semibold text-sm">Atheris AI</span>
        </div>
        <Link href="/" className="text-xs text-accent">
          Start your own chat →
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold mb-6">{conversation.title}</h1>
        <div className="space-y-6">
          {(messages ?? []).map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {m.role === "user" ? (
                <div className="max-w-lg rounded-2xl bg-accent text-accent-fg px-4 py-2.5 text-sm">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-lg prose-atheris prose prose-sm dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted text-center mt-10">
          This is a read-only shared conversation from Atheris AI.
        </p>
      </div>
    </div>
  );
}
