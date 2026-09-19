import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "Chat",
    body: "General-purpose conversation. Pick any Atheris model from the selector — Lite for speed, Pro for harder reasoning, Vision when you attach an image. Every conversation is saved automatically and searchable from the sidebar.",
  },
  {
    title: "Coding",
    body: "A dedicated space tuned for programming — debugging, writing functions, reviewing code, explaining errors. Keeps its own conversation history separate from general Chat.",
  },
  {
    title: "Daily Life",
    body: "Personal-assistant mode for everyday planning: routines, habits, meal ideas, budgeting basics, travel, and everyday decisions.",
  },
  {
    title: "Business",
    body: "Strategy, marketing copy, pricing, emails, and planning help, with direct and structured answers.",
  },
  {
    title: "Atheris Image",
    body: "Generate images from a text description. Every generation is saved to your history so you can revisit or re-download it later.",
  },
  {
    title: "Atheris Documents",
    body: "Describe what you need and pick a format — Word, PowerPoint, Excel, or PDF — and Atheris drafts real content and renders an actual downloadable file.",
  },
];

const FAQS = [
  {
    q: "Which AI models power Atheris?",
    a: "Atheris routes each request to the model best suited to it, drawn from current models on the backend — you'll see them labeled by capability (e.g. Atheris Lite, Atheris Pro, Atheris Vision) rather than by the underlying provider's name.",
  },
  {
    q: "Are my conversations private?",
    a: "Yes — only you can see your conversations by default. You can optionally generate a public read-only link for a specific conversation from its ⋯ menu if you want to share it.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Credits reset automatically each month. You can see your usage in Settings → Profile.",
  },
  {
    q: "Can I export my conversations?",
    a: "Yes — the download icon in the chat header exports the current conversation as a Markdown file.",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-sm font-semibold">Docs</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-2">Documentation</h1>
        <p className="text-sm text-muted mb-10">Everything Atheris AI can do, in one place.</p>

        <h2 className="text-lg font-semibold mb-4">Sections</h2>
        <div className="space-y-5 mb-12">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="text-sm font-medium mb-1">{s.title}</h3>
              <p className="text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-4">Frequently asked questions</h2>
        <div className="space-y-5">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-medium mb-1">{f.q}</h3>
              <p className="text-sm text-muted">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/contact" className="text-sm text-accent">
            Still have a question? Contact us →
          </Link>
        </div>
      </div>
    </div>
  );
}
