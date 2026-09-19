"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Users, ShieldAlert, Megaphone } from "lucide-react";
import clsx from "clsx";

type Tab = "overview" | "users" | "moderation" | "announcements";

interface Stats {
  userCount: number;
  conversationCount: number;
  messageCount: number;
  imageCount: number;
  totalCreditsRemaining: number;
}

interface AdminUser {
  id: string;
  full_name: string | null;
  credits_remaining: number;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}

interface ModerationItem {
  id: string;
  user_id: string;
  prompt: string;
  image_data: string;
  created_at: string;
}

interface Announcement {
  id: string;
  message: string;
  created_at: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [accessDenied, setAccessDenied] = useState(false);
  const [notConfigured, setNotConfigured] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={14} /> },
    { id: "users", label: "Users", icon: <Users size={14} /> },
    { id: "moderation", label: "Moderation", icon: <ShieldAlert size={14} /> },
    { id: "announcements", label: "Announcements", icon: <Megaphone size={14} /> },
  ];

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-lg font-semibold mb-2">Admin access required</h1>
          <p className="text-sm text-muted mb-4">
            Your account doesn&apos;t have admin permissions.
          </p>
          <Link href="/dashboard" className="text-sm text-accent">
            Back to Atheris
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold">Atheris Admin</h1>
      </header>

      {notConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-600">
          {notConfigured}
        </div>
      )}

      <div className="max-w-5xl mx-auto flex gap-8 px-4 py-8">
        <nav className="w-48 shrink-0 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left",
                tab === t.id ? "bg-surface font-medium" : "text-muted hover:bg-surface/60"
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {tab === "overview" && (
            <OverviewTab onDenied={() => setAccessDenied(true)} onNotConfigured={setNotConfigured} />
          )}
          {tab === "users" && (
            <UsersTab onDenied={() => setAccessDenied(true)} onNotConfigured={setNotConfigured} />
          )}
          {tab === "moderation" && (
            <ModerationTab onDenied={() => setAccessDenied(true)} onNotConfigured={setNotConfigured} />
          )}
          {tab === "announcements" && (
            <AnnouncementsTab onDenied={() => setAccessDenied(true)} onNotConfigured={setNotConfigured} />
          )}
        </div>
      </div>
    </div>
  );
}

type TabProps = { onDenied: () => void; onNotConfigured: (msg: string | null) => void };

function useAdminFetch<T>(
  url: string,
  { onDenied, onNotConfigured }: TabProps
): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null);

  function load() {
    fetch(url)
      .then(async (r) => {
        if (r.status === 403) {
          onDenied();
          return null;
        }
        const json = await r.json();
        if (r.status === 501) {
          onNotConfigured(json.error);
          return null;
        }
        onNotConfigured(null);
        return json;
      })
      .then((json) => json && setData(json))
      .catch(() => {});
  }

  useEffect(load, [url]);
  return [data, load];
}

function OverviewTab(props: TabProps) {
  const [data] = useAdminFetch<{ stats: Stats }>("/api/admin/stats", props);
  const stats = data?.stats;

  const cards = [
    { label: "Users", value: stats?.userCount },
    { label: "Conversations", value: stats?.conversationCount },
    { label: "Messages", value: stats?.messageCount },
    { label: "Images generated", value: stats?.imageCount },
    { label: "Total credits remaining (all users)", value: stats?.totalCreditsRemaining },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border p-4">
            <div className="text-2xl font-semibold">{c.value ?? "—"}</div>
            <div className="text-xs text-muted mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted mt-4">
        Watch credit usage here to see how close you are to your free-tier API limits.
      </p>
    </div>
  );
}

function UsersTab(props: TabProps) {
  const [data, reload] = useAdminFetch<{ users: AdminUser[] }>("/api/admin/users", props);
  const users = data?.users ?? [];

  async function toggleSuspend(u: AdminUser) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_suspended: !u.is_suspended }),
    });
    reload();
  }

  async function adjustCredits(u: AdminUser) {
    const value = prompt(`Set credits for ${u.full_name ?? u.id}`, String(u.credits_remaining));
    if (value === null) return;
    const num = Number(value);
    if (Number.isNaN(num)) return;
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits_remaining: num }),
    });
    reload();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Users</h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Credits</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">{u.full_name ?? "—"}{u.is_admin && <span className="ml-2 text-xs text-accent">admin</span>}</td>
                <td className="px-3 py-2">{u.credits_remaining}</td>
                <td className="px-3 py-2">
                  {u.is_suspended ? (
                    <span className="text-red-500">Suspended</span>
                  ) : (
                    <span className="text-muted">Active</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => adjustCredits(u)} className="text-xs text-accent">
                    Edit credits
                  </button>
                  <button
                    onClick={() => toggleSuspend(u)}
                    className={clsx("text-xs", u.is_suspended ? "text-accent" : "text-red-500")}
                  >
                    {u.is_suspended ? "Reinstate" : "Suspend"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted text-xs">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModerationTab(props: TabProps) {
  const [data, reload] = useAdminFetch<{ items: ModerationItem[] }>("/api/admin/moderation", props);
  const items = data?.items ?? [];

  async function resolve(id: string) {
    await fetch("/api/admin/moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Moderation queue</h2>
      <p className="text-xs text-muted mb-4">Flagged image generations awaiting review.</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing flagged right now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border overflow-hidden">
              <img src={item.image_data} alt={item.prompt} className="w-full aspect-square object-cover" />
              <div className="p-2">
                <p className="text-xs text-muted truncate">{item.prompt}</p>
                <button onClick={() => resolve(item.id)} className="text-xs text-accent mt-1">
                  Mark reviewed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab(props: TabProps) {
  const [data, reload] = useAdminFetch<{ announcements: Announcement[] }>(
    "/api/admin/announcements",
    props
  );
  const announcements = data?.announcements ?? [];
  const [message, setMessage] = useState("");

  async function post() {
    if (!message.trim()) return;
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    setMessage("");
    reload();
  }

  async function deactivate(id: string) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    reload();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Announcements</h2>
      <div className="flex gap-2 mb-6 max-w-lg">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Atheris Pro is temporarily limited due to high demand"
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          onClick={post}
          className="rounded-lg bg-accent text-accent-fg px-4 py-2 text-sm font-medium"
        >
          Post
        </button>
      </div>

      <div className="space-y-2">
        {announcements.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <span className="text-sm">{a.message}</span>
            <button onClick={() => deactivate(a.id)} className="text-xs text-red-500 shrink-0 ml-3">
              Deactivate
            </button>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-muted">No active announcements.</p>
        )}
      </div>
    </div>
  );
}
