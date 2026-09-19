"use client";

import { useRef, useState } from "react";
import { Send, Square, RotateCcw, Paperclip, X, Download } from "lucide-react";
import { ChatMessage } from "@/lib/ai-router";
import { Section } from "@/lib/conversations";
import ModelSelector from "@/components/ModelSelector";
import ThemeToggle from "@/components/ThemeToggle";
import MessageBubble from "@/components/MessageBubble";
import Sidebar from "@/components/Sidebar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import TemplatesMenu from "@/components/TemplatesMenu";
import VoiceInputButton from "@/components/VoiceInputButton";
import SectionTabs from "@/components/SectionTabs";

export default function ChatSection({
  section,
  systemPrompt,
  emptyTitle,
  emptyHint,
  placeholder,
}: {
  section: Section;
  systemPrompt?: string;
  emptyTitle: string;
  emptyHint: string;
  placeholder: string;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function selectConversation(id: string) {
    setConversationId(id);
    setError(null);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section }),
    });
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setUploadError(null);

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are supported right now.");
        continue;
      }
      if (file.size > 4 * 1024 * 1024) {
        setUploadError("Images must be under 4MB.");
        continue;
      }
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPendingImages((prev) => [...prev, dataUri]);
    }
  }

  function removePendingImage(idx: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function sendMessage(overrideMessages?: ChatMessage[]) {
    const history = overrideMessages ?? messages;
    if (!overrideMessages && !input.trim() && pendingImages.length === 0) return;

    const isFirstMessage = history.length === 0 && !overrideMessages;
    const convoId = await ensureConversation();

    const nextMessages: ChatMessage[] = overrideMessages
      ? history
      : [
          ...history,
          {
            role: "user",
            content: input.trim(),
            ...(pendingImages.length > 0 && { images: pendingImages }),
          },
        ];

    setMessages(nextMessages);
    setInput("");
    setPendingImages([]);
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: nextMessages,
          conversationId: convoId,
          isFirstMessage,
          systemPrompt,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: accumulated };
          return copy;
        });
      }

      setSidebarRefreshKey((k) => k + 1);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message ?? "Atheris couldn't respond. Please try again.");
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function regenerate() {
    if (messages.length < 2) return;
    sendMessage(messages.slice(0, -1));
  }

  function exportChat() {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `**${m.role === "user" ? "You" : "Atheris"}:**\n\n${m.content}\n`)
      .join("\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atheris-conversation.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        activeId={conversationId}
        onSelect={selectConversation}
        onNewChat={newChat}
        refreshKey={sidebarRefreshKey}
        section={section}
      />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ModelSelector value={model} onChange={setModel} />
            <SectionTabs />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={exportChat}
                className="rounded-lg p-2 hover:bg-surface text-muted"
                aria-label="Export chat"
              >
                <Download size={16} />
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>
        <AnnouncementBanner />

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted">
              <img src="/logo-icon.png" alt="Atheris AI" className="h-14 w-14 rounded-full mb-4" />
              <p className="text-lg font-medium text-text">{emptyTitle}</p>
              <p className="text-sm mt-1">{emptyHint}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role as "user" | "assistant"}
              content={m.content}
              images={m.images}
            />
          ))}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>

        <div className="border-t border-border p-4">
          <div className="mx-auto max-w-2xl">
            {pendingImages.length > 0 && (
              <div className="flex gap-2 mb-2">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="attachment" className="h-16 w-16 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => removePendingImage(i)}
                      className="absolute -top-1.5 -right-1.5 bg-bg border border-border rounded-full p-0.5"
                      aria-label="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadError && <p className="text-xs text-red-500 mb-2">{uploadError}</p>}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-border p-3 hover:bg-surface text-muted"
                aria-label="Attach image"
              >
                <Paperclip size={16} />
              </button>
              <TemplatesMenu onPick={(content) => setInput(content)} currentInput={input} />
              <VoiceInputButton onResult={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))} />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder={placeholder}
                className="flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              />
              {streaming ? (
                <button
                  onClick={stop}
                  className="rounded-xl bg-surface border border-border p-3 hover:bg-border/40"
                  aria-label="Stop"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() && pendingImages.length === 0}
                  className="rounded-xl bg-accent text-accent-fg p-3 disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send size={16} />
                </button>
              )}
              {!streaming && messages.length > 0 && (
                <button
                  onClick={regenerate}
                  className="rounded-xl border border-border p-3 hover:bg-surface"
                  aria-label="Regenerate"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
