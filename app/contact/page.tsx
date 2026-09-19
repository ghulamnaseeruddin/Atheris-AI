"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WhatsAppIcon, InstagramIcon, GitHubIcon, GmailIcon } from "@/components/BrandIcons";

const SOCIALS = [
  {
    name: "WhatsApp",
    href: "https://wa.me/923496307015",
    icon: WhatsAppIcon,
    color: "hover:text-[#25D366]",
  },
  {
    name: "Instagram",
    href: "https://instagram.com/naseer_ludhiana",
    icon: InstagramIcon,
    color: "hover:text-[#E4405F]",
  },
  {
    name: "GitHub",
    href: "https://github.com/ghulamnaseeruddin",
    icon: GitHubIcon,
    color: "hover:text-text",
  },
  {
    name: "Email",
    href: "mailto:ghulamnaseeruddin555@gmail.com",
    icon: GmailIcon,
    color: "",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your message.");
      setStatus("sent");
      setForm({ firstName: "", lastName: "", phone: "", email: "", message: "" });
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message ?? "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-sm font-semibold">Contact</span>
      </header>

      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-center mb-2">Get in touch</h1>
        <p className="text-sm text-muted text-center mb-8">
          Reach out directly, or send a message below.
        </p>

        <div className="flex items-center justify-center gap-5 mb-10">
          {SOCIALS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              title={s.name}
              className={`text-muted transition-colors ${s.color}`}
            >
              <s.icon className="h-7 w-7" />
            </a>
          ))}
        </div>

        {status === "sent" ? (
          <div className="text-center rounded-xl border border-border p-8">
            <p className="text-lg font-medium mb-1">Message sent</p>
            <p className="text-sm text-muted">Thanks for reaching out — I'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">First Name</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Last Name</label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {status === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-accent text-accent-fg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
