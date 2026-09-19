"use client";

import { useEffect, useState } from "react";
import { BookMarked, Plus, Trash2 } from "lucide-react";

interface Template {
  id: string;
  title: string;
  content: string;
}

export default function TemplatesMenu({
  onPick,
  currentInput,
}: {
  onPick: (content: string) => void;
  currentInput: string;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function load() {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function saveCurrent() {
    if (!newTitle.trim() || !currentInput.trim()) return;
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), content: currentInput }),
    });
    setNewTitle("");
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-border p-3 hover:bg-surface text-muted"
        aria-label="Prompt templates"
      >
        <BookMarked size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border bg-bg shadow-lg z-20 p-2 max-h-80 overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="text-xs font-medium text-muted">Saved prompts</span>
              <button
                onClick={() => setSaving((s) => !s)}
                className="flex items-center gap-1 text-xs text-accent"
              >
                <Plus size={12} /> Save current
              </button>
            </div>

            {saving && (
              <div className="flex gap-1.5 px-1 pb-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveCurrent()}
                  placeholder="Template name…"
                  className="flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none"
                />
                <button
                  onClick={saveCurrent}
                  className="text-xs text-accent-fg bg-accent rounded-lg px-2"
                >
                  Save
                </button>
              </div>
            )}

            {templates.length === 0 && (
              <p className="text-xs text-muted px-1 py-3 text-center">No saved prompts yet.</p>
            )}

            {templates.map((t) => (
              <div
                key={t.id}
                className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface cursor-pointer"
                onClick={() => {
                  onPick(t.content);
                  setOpen(false);
                }}
              >
                <span className="text-sm truncate">{t.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
