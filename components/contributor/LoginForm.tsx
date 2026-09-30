"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// Supabase's built-in mailer only delivers to the project team until a custom
// SMTP server is configured; surface that as a readable message instead of a
// raw API error.
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not authorized"))
    return "Pengiriman email untuk alamat ini belum diaktifkan. Silakan hubungi redaksi@kabarpinter.com.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.";
  if (m.includes("invalid") && m.includes("email")) return "Alamat email tidak valid.";
  return message;
}

export function LoginForm({ linkExpired }: { linkExpired: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Default (uneditable) Supabase email template -> PKCE callback route.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(friendlyError(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="notice notice--success">
        Link masuk sudah dikirim ke <strong>{email}</strong>. Buka email Anda (cek juga
        folder Spam), lalu klik tautannya. <strong>Buka di browser yang sama</strong> dengan
        yang Anda pakai sekarang.
      </div>
    );
  }

  return (
    <>
      {linkExpired && (
        <div className="notice notice--error">
          Link masuk tidak valid, sudah kedaluwarsa, atau dibuka di browser yang berbeda dari
          yang meminta link. Minta link baru di bawah ini, lalu buka di browser yang sama.
        </div>
      )}
      <form onSubmit={handleSubmit} className="cform">
        <label className="cform__label">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@anda.com"
            className="cform__input"
            autoComplete="email"
          />
        </label>
        {error && <p className="cform__error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Mengirim…" : "Kirim Link Masuk"}
        </button>
      </form>
    </>
  );
}
