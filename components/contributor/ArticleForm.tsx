"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ArticleForm({
  userId,
  categories,
}: {
  userId: string;
  categories: { slug: string; label: string }[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_IMAGE_BYTES) {
      setError("Ukuran foto maksimal 5MB.");
      e.target.value = "";
      setImageFile(null);
      return;
    }
    setError(null);
    setImageFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const supabase = createBrowserClient();

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("contributor-uploads")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("contributor-uploads").getPublicUrl(path)
          .data.publicUrl;
      }

      const baseSlug = slugify(title, new Set());
      const payload = {
        source_type: "contributor" as const,
        status: "submitted" as const,
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        body: body.trim() || null,
        image_url: imageUrl,
        category_slug: categorySlug || null,
        contributor_id: userId,
      };

      let { error: insertError } = await supabase
        .from("articles")
        .insert({ ...payload, slug: baseSlug });

      // The slug uniqueness pre-check only sees published articles (RLS
      // hides other users' drafts) - a genuine collision surfaces here as
      // a unique-violation instead, so retry once with a random suffix
      // rather than pretending false confidence in the first slug.
      if (insertError?.code === "23505") {
        const retrySlug = slugify(title, new Set([baseSlug]));
        ({ error: insertError } = await supabase
          .from("articles")
          .insert({ ...payload, slug: retrySlug }));
      }

      if (insertError) throw insertError;

      setSuccess(true);
      setTitle("");
      setExcerpt("");
      setBody("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim artikel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cform">
      <label className="cform__label">
        Judul
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Yang Perlu Diketahui Soal Tekanan Darah Tinggi"
          className="cform__input"
        />
      </label>
      <label className="cform__label">
        Kategori
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="cform__input"
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="cform__label">
        Ringkasan singkat
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="1-2 kalimat ringkasan untuk kartu berita"
          className="cform__textarea"
          rows={2}
        />
      </label>
      <label className="cform__label">
        Isi ulasan
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis isi ulasan di sini. Satu baris kosong = paragraf baru."
          className="cform__textarea"
          rows={10}
        />
      </label>
      <label className="cform__label">
        Foto (opsional, maks 5MB)
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="cform__input"
        />
      </label>
      {error && <p className="cform__error">{error}</p>}
      {success && (
        <p className="cform__success">
          Terkirim! Artikel Anda akan tayang setelah ditinjau tim redaksi.
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Mengirim…" : "Kirim untuk Ditinjau"}
      </button>
    </form>
  );
}
