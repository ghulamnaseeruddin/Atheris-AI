"use client";

import ChatSection from "@/components/ChatSection";

export default function DashboardPage() {
  return (
    <ChatSection
      section="chat"
      emptyTitle="Ask Atheris anything"
      emptyHint="Start a conversation below."
      placeholder="Message Atheris…"
    />
  );
}
