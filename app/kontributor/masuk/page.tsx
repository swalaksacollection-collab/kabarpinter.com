"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-charcoal">Masuk Kontributor</h1>
      {sent ? (
        <p className="mt-6 text-brand-charcoal/70">
          Link masuk sudah dikirim ke {email}. Cek email Anda.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@anda.com"
            className="w-full rounded border border-brand-charcoal/20 px-4 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded bg-brand-charcoal px-4 py-2 text-brand-cream"
          >
            Kirim Link Masuk
          </button>
        </form>
      )}
    </main>
  );
}
