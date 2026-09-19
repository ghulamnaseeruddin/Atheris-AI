"use client";

import ChatSection from "@/components/ChatSection";

const SYSTEM_PROMPT = `You are Atheris in Business mode — a sharp business and startup assistant. Help with strategy, marketing copy, pricing, pitch decks content, emails, negotiation prep, market analysis, and operations. Be direct and structured; use short sections or bullet points for anything with multiple parts. Flag risks or missing information rather than assuming.`;

export default function BusinessPage() {
  return (
    <ChatSection
      section="business"
      systemPrompt={SYSTEM_PROMPT}
      emptyTitle="Ask Atheris about business"
      emptyHint="Strategy, copy, pricing, emails, planning."
      placeholder="Ask about a business decision, draft, or plan…"
    />
  );
}
