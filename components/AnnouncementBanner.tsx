"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<{ id: string; message: string }[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => setAnnouncements(d.announcements ?? []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="border-b border-border bg-accent/5 px-4 py-2 space-y-1">
      {visible.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <Megaphone size={12} className="text-accent shrink-0" /> {a.message}
          </span>
          <button onClick={() => setDismissed((prev) => [...prev, a.id])} aria-label="Dismiss">
            <X size={12} className="text-muted" />
          </button>
        </div>
      ))}
    </div>
  );
}
