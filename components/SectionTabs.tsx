"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ImageIcon, FileText, Code2, Sun, Briefcase } from "lucide-react";
import clsx from "clsx";

const TABS = [
  { href: "/dashboard", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/image", label: "Image", icon: ImageIcon },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/coding", label: "Coding", icon: Code2 },
  { href: "/dashboard/daily-life", label: "Daily Life", icon: Sun },
  { href: "/dashboard/business", label: "Business", icon: Briefcase },
];

export default function SectionTabs() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border p-0.5 overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
              active ? "bg-surface font-medium" : "text-muted hover:bg-surface"
            )}
          >
            <Icon size={14} /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
