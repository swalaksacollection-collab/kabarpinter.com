import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffContext } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { Avatar } from "@/components/Avatar";
import { Flash, AccessDenied } from "@/components/admin/Flash";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { Article } from "@/lib/types";
import { updateOpinion } from "../../actions";

export const metadata: Metadata = { title: "Edit Ulasan", robots: { index: false } };

export default async function EditOpinionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const { supabase, isAdmin, isStaff } = await getStaffContext();
  if (!isStaff) return <AccessDenied text="Halaman ini khusus untuk tim redaksi." />;

  const { data } = await supabase
    .from("articles")
    .select("*, author:contributor_id(display_name, bio, avatar_url)")
    .eq("id", id)
    .eq("source_type", "contributor")
    .maybeSingle();
  if (!data) notFound();
  const a = data as unknown as Article;

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Edit Ulasan
          </h1>
        </div>
        <AdminNav current="ulasan" isAdmin={isAdmin} />
        <Flash ok={ok} error={error} />

        <p style={{ marginBottom: 16 }}>
          <Link href="/redaksi/ulasan">← Kembali ke daftar</Link>
          {a.status === "published" && (
            <>
              {" · "}
              <Link href={`/artikel/${a.slug}`} target="_blank">
                Lihat di situs
              </Link>
            </>
          )}
        </p>

        <div className="adm-byline" style={{ marginBottom: 20 }}>
          <Avatar name={a.author?.display_name ?? "Kontributor"} url={a.author?.avatar_url} size={44} />
          <div>
            <strong>{a.author?.display_name ?? "Kontributor"}</strong>
            {a.author?.bio && <div className="my-articles__meta">{a.author.bio}</div>}
            {isAdmin && (
              <div className="my-articles__meta">
                <Link href="/redaksi/kontributor">Ubah foto profil pakar</Link>
              </div>
            )}
          </div>
        </div>

        {a.filter_flags && a.filter_flags.length > 0 && (
          <div className="notice notice--info" style={{ marginBottom: 20 }}>
            <strong>Peringatan filter saat dikirim:</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {a.filter_flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={updateOpinion} className="cform" style={{ maxWidth: 680 }}>
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
            <textarea
              name="excerpt"
              rows={2}
              maxLength={400}
              defaultValue={a.excerpt ?? ""}
              className="cform__textarea"
            />
          </label>
          <label className="cform__label">
            Isi ulasan (satu baris kosong = paragraf baru)
            <textarea name="body" rows={16} defaultValue={a.body ?? ""} className="cform__textarea" />
          </label>
          <ImageUploadField
            name="image_url"
            folder="illustrations"
            label="Foto ilustrasi (opsional)"
            initialUrl={a.image_url}
            maxSide={1600}
            hint="Ganti atau hapus foto ilustrasi tulisan ini."
          />
          <button type="submit" className="btn-primary">
            Simpan perubahan
          </button>
        </form>
      </div>
    </main>
  );
}
