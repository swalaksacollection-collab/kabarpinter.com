import type { Metadata } from "next";
import Link from "next/link";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { aiConfigured } from "@/lib/ai-article";
import { fullDateTime } from "@/lib/date";
import { importFromLinks } from "./actions";

export const metadata: Metadata = { title: "Impor Berita", robots: { index: false } };
// Reading pages + AI writing can take a minute.
export const maxDuration = 200;

type Row = { id: string; title: string; status: string; published_at: string | null; created_at: string };

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { supabase, isAdmin, isStaff } = await getStaffContext();
  if (!isStaff) return <AccessDenied text="Halaman ini khusus untuk tim redaksi." />;

  const { data } = await supabase
    .from("articles")
    .select("id, title, status, published_at, created_at")
    .eq("source_type", "redaksi")
    .order("created_at", { ascending: false })
    .limit(30);
  const rows = (data ?? []) as Row[];
  const ready = aiConfigured();

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Impor Berita
          </h1>
        </div>
        <AdminNav current="impor" isAdmin={isAdmin} />
        <Flash ok={ok} error={error} />

        {!ready && (
          <div className="notice notice--error" style={{ marginBottom: 16 }}>
            Penulis AI belum aktif. Tambahkan <code>OPENROUTER_API_KEY</code> di Vercel (Settings →
            Environment Variables), lalu deploy ulang.
          </div>
        )}

        <p style={{ marginBottom: 12 }}>
          Tempel link berita atau teks yang diteruskan lewat WhatsApp (boleh beberapa link). Sistem membaca
          halamannya, menggabungkan berita yang mirip, menulis ulang, dan menyimpan foto. Hasilnya berupa{" "}
          <strong>draf</strong>: periksa dulu, lalu tekan Terbitkan.
        </p>

        <form action={importFromLinks} className="cform" style={{ maxWidth: 680 }}>
          <label className="cform__label">
            Link / teks dari WhatsApp
            <textarea
              name="links"
              rows={7}
              required
              placeholder={"https://putraindonews.com/berita/...\nhttps://www.pakuanpos.com/..."}
              className="cform__textarea"
            />
          </label>
          <label className="cform__label" style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <input type="checkbox" name="photo_ok" value="1" defaultChecked style={{ marginTop: 4 }} />
            <span>
              Saya punya izin memakai foto-foto dari link ini (mis. dibagikan langsung oleh narasumbernya).
              Foto yang tidak diizinkan bisa dihapus di halaman edit.
            </span>
          </label>
          <SubmitButton pendingText="Memproses… (sekitar 1 menit, jangan tutup halaman)">
            Proses & buat draf
          </SubmitButton>
        </form>

        <h2 style={{ margin: "32px 0 12px", fontSize: 18 }}>Berita redaksi</h2>
        {rows.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada.</p>
        ) : (
          <ul className="adm-list">
            {rows.map((r) => (
              <li key={r.id} className="adm-row">
                <div style={{ flex: 1 }}>
                  <Link href={`${"/redaksi/impor"}/${r.id}`}>
                    <strong>{r.title}</strong>
                  </Link>
                  <div className="my-articles__meta">
                    {r.status === "published" ? "Tayang" : "Draf"} ·{" "}
                    {fullDateTime(r.published_at ?? r.created_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
