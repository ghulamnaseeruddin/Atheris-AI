import Link from "next/link";
import {
  MessageSquare,
  ImageIcon,
  FileText,
  Code2,
  Sun,
  Briefcase,
  Zap,
  ShieldCheck,
  Share2,
} from "lucide-react";

const FEATURES = [
  { icon: MessageSquare, title: "Chat", body: "Fast, natural conversation with a model chosen for the job." },
  { icon: Code2, title: "Coding", body: "Debug, write, and review code with a focused assistant." },
  { icon: Sun, title: "Daily Life", body: "Practical help for routines, planning, and everyday decisions." },
  { icon: Briefcase, title: "Business", body: "Strategy, copy, pricing, and planning support." },
  { icon: ImageIcon, title: "Image generation", body: "Turn a description into a real image, saved to your history." },
  { icon: FileText, title: "Documents", body: "Real Word, PowerPoint, Excel, and PDF files — not just text." },
];

const WHY = [
  { icon: Zap, title: "Fast by design", body: "Requests are routed to the model best suited for speed or depth." },
  { icon: ShieldCheck, title: "Your data stays yours", body: "Conversations are private by default; you choose what to share." },
  { icon: Share2, title: "Built to be used, not just tried", body: "Folders, templates, export, and voice input for real daily use." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <img src="/logo-icon.png" alt="Atheris AI" className="mx-auto mb-6 h-16 w-16 rounded-full" />
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Atheris AI</h1>
        <p className="mt-3 text-muted max-w-lg">
          One workspace for conversation, code, images, and documents — built to actually get
          things done, not just answer questions.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent text-accent-fg px-5 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface"
          >
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">No credit card required.</p>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-center text-sm font-medium text-muted mb-8">SIX WAYS TO WORK</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border p-5">
              <f.icon size={18} className="text-accent mb-3" />
              <h3 className="text-sm font-medium mb-1">{f.title}</h3>
              <p className="text-xs text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {WHY.map((w) => (
            <div key={w.title} className="text-center">
              <w.icon size={20} className="text-accent mx-auto mb-2" />
              <h3 className="text-sm font-medium mb-1">{w.title}</h3>
              <p className="text-xs text-muted">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-4 py-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span>Atheris AI</span>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="hover:text-text">Docs</Link>
            <Link href="/contact" className="hover:text-text">Contact</Link>
            <Link href="/login" className="hover:text-text">Log in</Link>
            <Link href="/signup" className="hover:text-text">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
