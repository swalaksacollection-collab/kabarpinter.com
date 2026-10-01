const OK_MESSAGES: Record<string, string> = {
  "foto-disimpan": "Foto profil disimpan.",
  "foto-dihapus": "Foto profil dihapus.",
  dinonaktifkan: "Kontributor dinonaktifkan. Ia tidak dapat mengirim tulisan baru.",
  diaktifkan: "Kontributor diaktifkan kembali.",
  "aturan-ditambah": "Aturan filter ditambahkan.",
  "aturan-diubah": "Aturan filter diperbarui.",
  "aturan-dihapus": "Aturan filter dihapus.",
  "popup-disimpan": "Popup disimpan.",
  "popup-diubah": "Status popup diperbarui.",
  "popup-dihapus": "Popup dihapus.",
  "pengaturan-disimpan": "Pengaturan iklan disimpan.",
  "slot-disimpan": "Slot iklan disimpan.",
  "ulasan-disimpan": "Ulasan disimpan.",
  diterbitkan: "Ulasan diterbitkan.",
  disembunyikan: "Ulasan disembunyikan dari situs.",
  dihapus: "Ulasan dihapus.",
};

// Result banner from ?ok=<code> / ?error=<message> set by the server actions.
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <div className="notice notice--error">{error}</div>;
  if (ok && OK_MESSAGES[ok]) return <div className="notice notice--success">{OK_MESSAGES[ok]}</div>;
  return null;
}

export function AccessDenied({ text }: { text: string }) {
  return (
    <main className="section">
      <div className="container">
        <p style={{ color: "var(--ink-mute)" }}>{text}</p>
      </div>
    </main>
  );
}
