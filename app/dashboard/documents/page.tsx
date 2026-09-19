"use client";

import { useState } from "react";
import { Sparkles, Download, FileType } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import SectionTabs from "@/components/SectionTabs";
import clsx from "clsx";
import { DocType } from "@/lib/document-generator";

const FORMATS: { id: DocType; label: string; hint: string }[] = [
  { id: "docx", label: "Word", hint: "Report, memo, letter" },
  { id: "pptx", label: "PowerPoint", hint: "Slide deck" },
  { id: "xlsx", label: "Excel", hint: "Structured data table" },
  { id: "pdf", label: "PDF", hint: "Formatted document" },
];

export default function DocumentsPage() {
  const [topic, setTopic] = useState("");
  const [docType, setDocType] = useState<DocType>("docx");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<{ name: string; url: string } | null>(null);

  async function handleGenerate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), docType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't generate that document.");
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `atheris-document.${docType}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setLastFile({ name: filename, url });

      // Trigger download immediately
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar activeId={null} onSelect={() => {}} onNewChat={() => {}} refreshKey={0} section="chat" />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <SectionTabs />
          <ThemeToggle />
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-10">
          <div className="mx-auto max-w-xl">
            <div className="text-center mb-8">
              <Sparkles className="mx-auto mb-3 text-accent" size={28} />
              <h1 className="text-lg font-medium">Generate a professional document</h1>
              <p className="text-sm text-muted mt-1">
                Describe what you need — Atheris drafts and formats it for you.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDocType(f.id)}
                  className={clsx(
                    "rounded-xl border px-3 py-3 text-left transition-colors",
                    docType === f.id ? "border-accent bg-accent/5" : "border-border hover:bg-surface"
                  )}
                >
                  <FileType size={16} className={docType === f.id ? "text-accent" : "text-muted"} />
                  <div className="text-sm font-medium mt-1.5">{f.label}</div>
                  <div className="text-xs text-muted">{f.hint}</div>
                </button>
              ))}
            </div>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={4}
              placeholder="e.g. Q3 marketing performance summary for a small e-commerce brand"
              className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />

            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className="w-full mt-3 rounded-xl bg-accent text-accent-fg py-3 text-sm font-medium disabled:opacity-40"
            >
              {loading ? "Generating…" : `Generate ${FORMATS.find((f) => f.id === docType)?.label} file`}
            </button>

            {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

            {lastFile && !loading && (
              <a
                href={lastFile.url}
                download={lastFile.name}
                className="flex items-center justify-center gap-2 mt-4 text-sm text-accent hover:underline"
              >
                <Download size={14} /> Download {lastFile.name} again
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
