"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, Volume2, Square } from "lucide-react";
import { useState } from "react";

export default function MessageBubble({
  role,
  content,
  images,
}: {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function toggleSpeak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl space-y-2">
          {images && images.length > 0 && (
            <div className="flex gap-2 justify-end flex-wrap">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt="attachment"
                  className="h-24 w-24 rounded-lg object-cover border border-border"
                />
              ))}
            </div>
          )}
          {content && (
            <div className="rounded-2xl bg-accent text-accent-fg px-4 py-2.5 text-sm">
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start group">
      <div className="max-w-2xl w-full">
        <div className="prose-atheris prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {content}
          </ReactMarkdown>
        </div>
        <div className="mt-1 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs text-muted hover:text-text"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={toggleSpeak}
            className="flex items-center gap-1 text-xs text-muted hover:text-text"
          >
            {speaking ? <Square size={12} /> : <Volume2 size={12} />}
            {speaking ? "Stop" : "Listen"}
          </button>
        </div>
      </div>
    </div>
  );
}
