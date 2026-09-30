"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export function ProfileForm({
  displayName: initialDisplayName,
  bio: initialBio,
}: {
  displayName: string;
  bio: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesi berakhir, silakan masuk lagi.");
      setSaving(false);
      return;
    }
    // Only display_name/bio are grantable to authenticated users (migration
    // 0004) - a broader update() here would just be rejected by Postgres,
    // never a client/RLS bypass risk.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio: bio || null })
      .eq("id", user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="cform">
      <label className="cform__label">
        Nama tampilan
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="mis. dr. Andi Wijaya, Sp.PD"
          className="cform__input"
        />
      </label>
      <label className="cform__label">
        Kredensial / bio singkat
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="mis. Dokter spesialis penyakit dalam, RS Siloam Jakarta"
          className="cform__textarea"
          rows={2}
        />
      </label>
      {error && <p className="cform__error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Menyimpan…" : saved ? "Tersimpan ✓" : "Simpan Profil"}
      </button>
    </form>
  );
}
