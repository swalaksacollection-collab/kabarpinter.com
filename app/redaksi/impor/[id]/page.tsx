import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { parseBody, isOwnBodyImage } from "@/lib/body";
import type { Article } from "@/lib/types";
import { saveRedaksiArticle, setRedaksiStatus, deleteRedaksiArticle } from "../actions";

export const metadata: Metadata = { title: "Edit Berita", robots: { index: false } };

export default async function EditRedaksiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; skip?: string }>;
}) {
  const { id } = await params;
  const { ok, error, skip } = await searchParams;
  const { supabase, isAdmin, can } = await getStaffContext();
  if (!can("impor")) return <AccessDenied text="Halaman ini khusus untuk tim redaksi." />;

  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("source_type", "redaksi")
    .maybeSingle();
  if (!data) notFound();
  const a = data as unknown as Article;
  const published = a.status === "published";
  const preview = parseBody(a.body ?? "", (s) => isOwnBodyImage(s, process.env.NEXT_PUBLIC_SUPABASE_URL!));

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Edit Berita
          </h1>
        </div>
        <AdminNav current="impor" isAdmin={isAdmin} />
        <Flash ok={ok} error={error} />
        {skip && (
          <div className="notice notice--info" style={{ marginBottom: 16 }}>
            Link ini dilewati karena tidak bisa dibaca: {skip}. Tempel link berita dari situs medianya.
          </div>
        )}

        <p style={{ marginBottom: 16 }}>
          <Link href="/redaksi/impor">← Kembali</Link>
          {published && (
            <>
              {" · "}
              <Link href={`/artikel/${a.slug}`} target="_blank">
                Lihat di situs
              </Link>
            </>
          )}
          {" · "}
          <strong>{published ? "Tayang" : "Draf (belum tayang)"}</strong>
        </p>
        {a.editor_note && <p className="my-articles__meta" style={{ marginBottom: 16 }}>{a.editor_note}</p>}

        <form action={saveRedaksiArticle} className="cform" style={{ maxWidth: 680 }}>
          <input type="hidden" name="id" value={a.id} />
          <label className="cform__label">
            Judul
            <input name="title" required maxLength={200} defaultValue={a.title} className="cform__input" />
          </label>
          <label className="cform__label">
            Kategori
            <select name="category_slug" defaultValue={a.category_slug ?? ""} className="cform__input">
              <option value="">(tanpa kategori)</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cform__label">
            Ringkasan
            <textarea name="excerpt" rows={2} maxLength={400} defaultValue={a.excerpt ?? ""} className="cform__textarea" />
          </label>
          <ImageUploadField
            name="image_url"
            folder="illustrations"
            label="Foto utama (tampil di atas dan di beranda)"
            initialUrl={a.image_url}
            maxSide={1600}
            hint="Ganti atau hapus foto utama."
          />
          <label className="cform__label">
            Isi berita. Satu baris = satu paragraf. <code>## Subjudul</code> untuk subjudul;{" "}
            <code>![keterangan foto](alamat-foto)</code> untuk foto di dalam teks (pindahkan barisnya untuk
            mengatur posisi, hapus barisnya untuk membuang foto).
            <textarea name="body" rows={20} defaultValue={a.body ?? ""} className="cform__textarea" />
          </label>
          <SubmitButton pendingText="Menyimpan…">Simpan perubahan</SubmitButton>
        </form>

        <div style={{ display: "flex", gap: 12, margin: "20px 0", flexWrap: "wrap" }}>
          <form action={setRedaksiStatus}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value={published ? "draft" : "published"} />
            <SubmitButton pendingText="Memproses…" className={published ? "btn-secondary" : "btn-primary"}>
              {published ? "Sembunyikan dari situs" : "Terbitkan sekarang (naik ke beranda)"}
            </SubmitButton>
          </form>
          <form action={deleteRedaksiArticle}>
            <input type="hidden" name="id" value={a.id} />
            <SubmitButton pendingText="Menghapus…" className="btn-secondary">
              Hapus berita
            </SubmitButton>
          </form>
        </div>
        <p className="my-articles__meta">Simpan perubahan dulu sebelum menekan Terbitkan.</p>

        <h2 style={{ margin: "28px 0 12px", fontSize: 18 }}>Pratinjau isi</h2>
        <div className="article__body">
          {preview.map((b, i) =>
            b.type === "p" ? (
              <p key={i}>{b.text}</p>
            ) : b.type === "h" ? (
              <h2 key={i}>{b.text}</h2>
            ) : (
              <figure key={i} className="article__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.caption} />
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>
            )
          )}
        </div>
      </div>
    </main>
  );
}
