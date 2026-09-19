"use client";

import { useEffect, useState } from "react";
import { Plus, LogOut, Pin, MoreHorizontal, Pencil, Trash2, Settings, Search, ShieldCheck, Folder as FolderIcon, FolderPlus, Share2, Check } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export interface ConversationSummary {
  id: string;
  title: string;
  pinned: boolean;
  updated_at: string;
  folder_id: string | null;
  shared: boolean;
  share_slug: string | null;
}

interface Folder {
  id: string;
  name: string;
}

export default function Sidebar({
  activeId,
  onSelect,
  onNewChat,
  refreshKey,
  section = "chat",
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  refreshKey: number; // bump this after sending a message to refresh the list
  section?: "chat" | "coding" | "daily-life" | "business";
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [query, setQuery] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(!!d?.profile?.is_admin))
      .catch(() => {});
  }, []);

  async function loadConversations() {
    const res = await fetch(`/api/conversations?section=${section}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
  }

  async function loadFolders() {
    const res = await fetch("/api/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders ?? []);
    }
  }

  useEffect(() => {
    loadConversations();
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, section]);

  async function createFolder() {
    if (!newFolderName.trim()) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    setNewFolderName("");
    setCreatingFolder(false);
    loadFolders();
  }

  async function moveToFolder(conversationId: string, folderId: string | null) {
    setMoveMenuId(null);
    setMenuOpenId(null);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    });
    loadConversations();
  }

  async function handleShare(c: ConversationSummary) {
    setMenuOpenId(null);
    const res = await fetch(`/api/conversations/${c.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shared: true }),
    });
    if (res.ok) {
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.slug}`;
      navigator.clipboard.writeText(url);
      setShareCopiedId(c.id);
      setTimeout(() => setShareCopiedId(null), 2000);
      loadConversations();
    }
  }

  async function handleDelete(id: string) {
    setMenuOpenId(null);
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) onNewChat();
  }

  async function handleTogglePin(c: ConversationSummary) {
    setMenuOpenId(null);
    await fetch(`/api/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !c.pinned }),
    });
    loadConversations();
  }

  async function handleRename(id: string) {
    if (renameValue.trim()) {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      loadConversations();
    }
    setRenamingId(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="w-64 border-r border-border flex flex-col p-3 hidden sm:flex">
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <img src="/logo-icon.png" alt="Atheris AI" className="h-6 w-6 rounded-full" />
        <span className="font-semibold text-sm">Atheris AI</span>
      </div>

      <div className="flex gap-1.5 mb-2">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
        >
          <Plus size={14} /> New chat
        </button>
        <button
          onClick={() => setCreatingFolder((s) => !s)}
          className="rounded-lg border border-border px-2.5 py-2 hover:bg-surface text-muted"
          aria-label="New folder"
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {creatingFolder && (
        <div className="flex gap-1.5 mb-2">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            placeholder="Folder name…"
            className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none"
          />
          <button onClick={createFolder} className="text-xs text-accent-fg bg-accent rounded-lg px-2">
            Add
          </button>
        </div>
      )}

      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-lg border border-border bg-surface pl-8 pr-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted px-2 py-4 text-center">
            {conversations.length === 0 ? "No conversations yet." : "No matches."}
          </p>
        )}

        {folders.map((folder) => {
          const items = filtered.filter((c) => c.folder_id === folder.id);
          if (items.length === 0) return null;
          return (
            <div key={folder.id} className="mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted">
                <FolderIcon size={11} /> {folder.name}
              </div>
              {items.map((c) => renderRow(c))}
            </div>
          );
        })}

        {filtered.filter((c) => !c.folder_id).map((c) => renderRow(c))}
      </div>

      <div className="pt-2 border-t border-border mt-2 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface"
        >
          <Settings size={14} /> Settings
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface"
          >
            <ShieldCheck size={14} /> Admin
          </Link>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </aside>
  );

  function renderRow(c: ConversationSummary) {
    return (
      <div
        key={c.id}
        className={clsx(
          "group relative flex items-center rounded-lg px-2 py-2 text-sm cursor-pointer",
          activeId === c.id ? "bg-surface" : "hover:bg-surface/60"
        )}
        onClick={() => onSelect(c.id)}
      >
        {c.pinned && <Pin size={11} className="mr-1.5 text-accent shrink-0" />}
        {renamingId === c.id ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => handleRename(c.id)}
            onKeyDown={(e) => e.key === "Enter" && handleRename(c.id)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent outline-none border-b border-accent text-sm"
          />
        ) : (
          <span className="flex-1 truncate">{c.title}</span>
        )}

        {shareCopiedId === c.id && <Check size={12} className="text-accent mr-1 shrink-0" />}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setMoveMenuId(null);
            setMenuOpenId(menuOpenId === c.id ? null : c.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-border/50 shrink-0"
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpenId === c.id && (
          <div
            className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-bg shadow-lg py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setRenamingId(c.id);
                setRenameValue(c.title);
                setMenuOpenId(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface"
            >
              <Pencil size={12} /> Rename
            </button>
            <button
              onClick={() => handleTogglePin(c)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface"
            >
              <Pin size={12} /> {c.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={() => handleShare(c)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface"
            >
              <Share2 size={12} /> {c.shared ? "Copy share link" : "Share"}
            </button>
            {folders.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveMenuId(moveMenuId === c.id ? null : c.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface"
              >
                <FolderIcon size={12} /> Move to folder
              </button>
            )}
            <button
              onClick={() => handleDelete(c.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-surface"
            >
              <Trash2 size={12} /> Delete
            </button>

            {moveMenuId === c.id && (
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => moveToFolder(c.id, null)}
                  className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-surface"
                >
                  No folder
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => moveToFolder(c.id, f.id)}
                    className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-surface"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
