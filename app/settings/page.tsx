"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Shield, Sliders, ShieldAlert, Gift, Camera } from "lucide-react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import PasswordField from "@/components/PasswordField";
import ThemeToggle from "@/components/ThemeToggle";

type Tab = "profile" | "security" | "preferences" | "privacy" | "referrals";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  credits_remaining: number;
  credits_total: number;
  credits_reset_at: string;
  created_at: string;
  auth_providers: string[];
  referral_code: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setUploadingAvatar(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);

      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl.publicUrl }),
      });

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl.publicUrl } : prev));
    } catch (err) {
      setSaveMsg("Couldn't upload avatar — make sure the 'avatars' storage bucket exists (see README).");
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setFullName(d.profile.full_name ?? "");
        }
      });
  }, []);

  async function saveProfile() {
    setSaveMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });
    setSaveMsg(res.ok ? "Saved." : "Couldn't save changes.");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={14} /> },
    { id: "security", label: "Account Security", icon: <Shield size={14} /> },
    { id: "preferences", label: "Preferences", icon: <Sliders size={14} /> },
    { id: "referrals", label: "Referrals", icon: <Gift size={14} /> },
    { id: "privacy", label: "Privacy & Data", icon: <ShieldAlert size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold">Settings</h1>
      </header>

      <div className="max-w-3xl mx-auto flex gap-8 px-4 py-8">
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
          {tab === "profile" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Profile</h2>

              <div className="flex items-center gap-4">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center text-accent-fg font-medium text-lg">
                      {(fullName || profile?.email || "A")[0]?.toUpperCase()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 bg-bg border border-border rounded-full p-1.5 cursor-pointer hover:bg-surface">
                    <Camera size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted">
                  {uploadingAvatar ? "Uploading…" : "Click the camera icon to change your avatar."}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  value={profile?.email ?? ""}
                  disabled
                  className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-muted"
                />
              </div>
              <button
                onClick={saveProfile}
                className="rounded-lg bg-accent text-accent-fg px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Save changes
              </button>
              {saveMsg && <p className="text-sm text-muted">{saveMsg}</p>}

              {profile && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-2">Usage this month</h3>
                  <div className="h-2 rounded-full bg-surface overflow-hidden max-w-sm">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: `${Math.min(
                          100,
                          ((profile.credits_total - profile.credits_remaining) /
                            profile.credits_total) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-1.5">
                    {profile.credits_remaining} of {profile.credits_total} credits remaining ·
                    resets {new Date(profile.credits_reset_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "security" && <SecurityTab profile={profile} supabase={supabase} />}

          {tab === "preferences" && <PreferencesTab />}

          {tab === "referrals" && <ReferralsTab profile={profile} />}

          {tab === "privacy" && <PrivacyTab router={router} />}
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ profile, supabase }: { profile: ProfileData | null; supabase: any }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function updatePassword() {
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setMsg(error ? error.message : "Password updated.");
    if (!error) {
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Account Security</h2>

      <div className="space-y-3 max-w-sm">
        <h3 className="text-sm font-medium">Change password</h3>
        <PasswordField id="newPw" label="New password" value={newPassword} onChange={setNewPassword} />
        <PasswordField
          id="confirmPw"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        <button
          onClick={updatePassword}
          className="rounded-lg bg-accent text-accent-fg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Update password
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium mb-2">Connected accounts</h3>
        <div className="flex gap-2 text-xs text-muted">
          {(profile?.auth_providers ?? []).filter(Boolean).length > 0 ? (
            profile!.auth_providers.filter(Boolean).map((p) => (
              <span key={p} className="rounded-full border border-border px-2.5 py-1 capitalize">
                {p}
              </span>
            ))
          ) : (
            <span>Email & password</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const [models, setModels] = useState<{ id: string; name: string; description: string }[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("atheris-default-model") ?? "" : ""
  );

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {});
  }, []);

  function setDefault(id: string) {
    setDefaultModel(id);
    localStorage.setItem("atheris-default-model", id);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Preferences</h2>

      <div>
        <h3 className="text-sm font-medium mb-2">Theme</h3>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-muted">Toggle light / dark</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Default model</h3>
        <div className="flex flex-col gap-2 max-w-sm">
          {models.length === 0 && <p className="text-xs text-muted">Loading models…</p>}
          {models.map((m) => (
            <label
              key={m.id}
              className={clsx(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer",
                defaultModel === m.id ? "border-accent" : "border-border"
              )}
            >
              <input
                type="radio"
                checked={defaultModel === m.id}
                onChange={() => setDefault(m.id)}
              />
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted">{m.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReferralsTab({ profile }: { profile: ProfileData | null }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined" && profile?.referral_code
      ? `${window.location.origin}/signup?ref=${profile.referral_code}`
      : "";

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Refer friends</h2>
      <p className="text-sm text-muted max-w-md">
        Share your link — when someone signs up with it, you both get 30 bonus credits.
      </p>
      <div className="flex gap-2 max-w-md">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted"
        />
        <button
          onClick={copy}
          className="rounded-lg bg-accent text-accent-fg px-4 py-2 text-sm font-medium shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function PrivacyTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    setMsg(null);
    const res = await fetch("/api/profile", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);

    if (res.ok) {
      router.push("/");
    } else {
      setMsg(data.error ?? "Couldn't delete account.");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Privacy & Data</h2>

      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <h3 className="text-sm font-medium text-red-500 mb-1">Delete account</h3>
        <p className="text-xs text-muted mb-3">
          Permanently deletes your account, all conversations, and messages. This cannot be
          undone.
        </p>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-500 text-red-500 px-4 py-2 text-sm font-medium hover:bg-red-500/10"
          >
            Delete my account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="rounded-lg bg-red-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, permanently delete"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        )}
        {msg && <p className="text-xs text-red-500 mt-2">{msg}</p>}
      </div>
    </div>
  );
}
