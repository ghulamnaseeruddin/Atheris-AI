"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold mb-2">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-muted mt-4">
            Check your email for a link to reset your password.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6 text-left">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className="w-full rounded-lg bg-accent text-accent-fg py-2.5 text-sm font-medium">
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
