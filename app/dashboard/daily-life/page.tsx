"use client";

import ChatSection from "@/components/ChatSection";

const SYSTEM_PROMPT = `You are Atheris in Daily Life mode — a warm, practical personal assistant. Help with everyday planning, routines, habits, meal ideas, travel, budgeting basics, errands, and general life advice. Keep answers practical and actionable, not generic. Ask a clarifying question only when it would meaningfully change your answer.`;

export default function DailyLifePage() {
  return (
    <ChatSection
      section="daily-life"
      systemPrompt={SYSTEM_PROMPT}
      emptyTitle="Ask Atheris about daily life"
      emptyHint="Routines, planning, habits, everyday decisions."
      placeholder="Ask about your day, plans, or a decision…"
    />
  );
}
