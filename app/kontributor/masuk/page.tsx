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
    <main className="section">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Masuk Kontributor
          </h1>
        </div>
        <p style={{ color: "var(--ink-mute)", marginTop: -12, marginBottom: 24 }}>
          Untuk kontributor dan pakar (dokter, akademisi, praktisi) yang menulis
          ulasan di Kabarpinter.com. Tidak perlu kata sandi - kami kirim link masuk
          ke email Anda.
        </p>
        {sent ? (
          <p>
            Link masuk sudah dikirim ke <strong>{email}</strong>. Cek email Anda.
          </p>
        ) : (
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
              />
            </label>
            {error && <p className="cform__error">{error}</p>}
            <button type="submit" className="btn-primary">
              Kirim Link Masuk
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
