"use client";

import ChatSection from "@/components/ChatSection";

const SYSTEM_PROMPT = `You are Atheris in Coding mode — a focused programming assistant. Help write, debug, explain, and review code across any language or framework. Default to clear, well-commented code blocks with the language tagged. Explain tradeoffs briefly rather than at length unless asked. When fixing a bug, say what was wrong before showing the fix.`;

export default function CodingPage() {
  return (
    <ChatSection
      section="coding"
      systemPrompt={SYSTEM_PROMPT}
      emptyTitle="Ask Atheris to code"
      emptyHint="Debug, write, explain, or review — in any language."
      placeholder="Ask about a bug, a function, a design…"
    />
  );
}
