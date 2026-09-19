"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import SectionTabs from "@/components/SectionTabs";

interface GeneratedImage {
  id: string;
  prompt: string;
  image_data: string;
  created_at: string;
}

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    fetch("/api/generate-image")
      .then((r) => r.json())
      .then((d) => setHistory(d.images ?? []));
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't generate that image.");
      }

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        image_data: data.image,
        created_at: new Date().toISOString(),
      };
      setCurrent(newImage);
      setHistory((prev) => [newImage, ...prev]);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function download(img: GeneratedImage) {
    const a = document.createElement("a");
    a.href = img.image_data;
    a.download = `atheris-${img.id}.png`;
    a.click();
  }

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar activeId={null} onSelect={() => {}} onNewChat={() => {}} refreshKey={0} section="chat" />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <SectionTabs />
          <ThemeToggle />
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
          <div className="mx-auto max-w-3xl">
            {current ? (
              <div className="mb-8">
                <img
                  src={current.image_data}
                  alt={current.prompt}
                  className="w-full rounded-2xl border border-border"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-muted truncate pr-4">{current.prompt}</p>
                  <button
                    onClick={() => download(current)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-text shrink-0"
                  >
                    <Download size={13} /> Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-muted py-20">
                <Sparkles className="mb-3" size={28} />
                <p className="text-lg font-medium text-text">Generate an image with Atheris</p>
                <p className="text-sm mt-1">Describe what you want to see below.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-500 text-center mb-4">{error}</p>}

            {history.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted mb-3">Recent generations</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {history.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setCurrent(img)}
                      className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80"
                    >
                      <img src={img.image_data} alt={img.prompt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <div className="mx-auto max-w-2xl flex items-end gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              rows={1}
              placeholder="Describe an image…"
              className="flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="rounded-xl bg-accent text-accent-fg px-4 py-3 text-sm font-medium disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
