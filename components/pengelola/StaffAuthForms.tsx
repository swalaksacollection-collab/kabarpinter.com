"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/permissions";
import { registerStaff } from "@/app/pengelola/actions";

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email atau password salah, atau email belum dikonfirmasi.";
  if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Klik tautan di email pendaftaran.";
  if (m.includes("rate limit") || m.includes("too many")) return "Terlalu banyak percobaan. Tunggu beberapa menit.";
  return message;
}

type Mode = "masuk" | "daftar" | "lupa";

export function StaffLoginForm({ sebagai }: { sebagai: "admin" | "redaksi" }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError(friendly(error.message));
      return;
    }
    router.push("/pengelola");
    router.refresh();
  }

  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/pengelola/password`,
    });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setInfo("Jika email itu terdaftar, tautan untuk membuat password baru sudah dikirim. Buka di browser ini.");
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <div className="adm-tabs" style={{ marginBottom: 16 }}>
        {(["masuk", "daftar", "lupa"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={mode === m ? "admin-nav__item admin-nav__item--active" : "admin-nav__item"}
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
          >
            {m === "masuk" ? "Masuk" : m === "daftar" ? "Daftar (diundang)" : "Lupa password"}
          </button>
        ))}
      </div>

      {error && <div className="notice notice--error">{error}</div>}
      {info && <div className="notice notice--success">{info}</div>}

      {mode === "masuk" && (
        <form onSubmit={login} className="cform">
          <label className="cform__label">
            Email
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="cform__input" />
          </label>
          <label className="cform__label">
            Password
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="cform__input" />
          </label>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Masuk…" : `Masuk sebagai ${sebagai}`}
          </button>
        </form>
      )}

      {mode === "daftar" && (
        <form
          action={registerStaff}
          className="cform"
          onSubmit={(e) => {
            const form = e.currentTarget;
            const weak = validateNewPassword(
              String(new FormData(form).get("password") ?? ""),
              String(new FormData(form).get("email") ?? "")
            );
            if (weak) {
              e.preventDefault();
              setError(weak);
            }
          }}
        >
          <p style={{ fontSize: 14 }}>
            Hanya untuk email yang sudah diundang super admin. Buat password sendiri (minimal 12
            karakter), lalu konfirmasi lewat email.
          </p>
          <label className="cform__label">
            Email undangan
            <input name="email" type="email" required autoComplete="username" className="cform__input" />
          </label>
          <label className="cform__label">
            Buat password
            <input name="password" type="password" required minLength={12} autoComplete="new-password" className="cform__input" />
          </label>
          <button className="btn-primary">Daftar</button>
        </form>
      )}

      {mode === "lupa" && (
        <form onSubmit={forgot} className="cform">
          <label className="cform__label">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="cform__input" />
          </label>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim tautan password baru"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ChangePasswordForm({ email }: { email: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) return setError("Konfirmasi password tidak sama.");
    const weak = validateNewPassword(pw, email);
    if (weak) return setError(weak);
    setBusy(true);
    const { error } = await createBrowserClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setPw("");
    setPw2("");
    setDone(true);
  }

  return (
    <form onSubmit={submit} className="cform" style={{ maxWidth: 420 }}>
      {error && <div className="notice notice--error">{error}</div>}
      {done && <div className="notice notice--success">Password diperbarui.</div>}
      <label className="cform__label">
        Password baru (minimal 12 karakter)
        <input type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="cform__input" />
      </label>
      <label className="cform__label">
        Ulangi password baru
        <input type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="cform__input" />
      </label>
      <button className="btn-primary" disabled={busy}>
        {busy ? "Menyimpan…" : "Simpan password"}
      </button>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        await createBrowserClient().auth.signOut();
        router.push("/pengelola/masuk");
        router.refresh();
      }}
    >
      Keluar
    </button>
  );
}
