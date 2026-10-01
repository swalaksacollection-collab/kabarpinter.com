"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { resizeToJpeg } from "@/lib/client-image";
import { MEDIA_BUCKET, mediaObjectPath, type MediaFolder } from "@/lib/media";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

// Picks a photo, shrinks it in the browser, uploads it to the admin-managed
// `site-media` bucket and puts the resulting public URL in a hidden input, so
// the surrounding <form> + server action only ever receives a URL.
export function ImageUploadField({
  name,
  folder,
  label,
  initialUrl,
  square = false,
  maxSide = 1280,
  hint,
}: {
  name: string;
  folder: MediaFolder;
  label: string;
  initialUrl?: string | null;
  square?: boolean;
  maxSide?: number;
  hint?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Gunakan foto JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("Ukuran foto terlalu besar (maks 12 MB).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await resizeToJpeg(file, maxSide, square);
      const supabase = createBrowserClient();
      const path = mediaObjectPath(folder);
      const { error: upErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) throw upErr;
      setUrl(supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cform__label">
      {label}
      <div className="imgfield">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={square ? "imgfield__preview imgfield__preview--square" : "imgfield__preview"}
          />
        ) : (
          <div
            className={
              square
                ? "imgfield__preview imgfield__preview--square imgfield__preview--empty"
                : "imgfield__preview imgfield__preview--empty"
            }
          >
            Belum ada foto
          </div>
        )}
        <div className="imgfield__controls">
          <input type="file" accept={ACCEPT} onChange={onFile} disabled={busy} className="cform__input" />
          {url && (
            <button type="button" className="btn-outline" onClick={() => setUrl("")} disabled={busy}>
              Hapus foto
            </button>
          )}
          {busy && <span className="cform__hint">Mengunggah…</span>}
          {hint && !busy && <span className="cform__hint">{hint}</span>}
        </div>
      </div>
      <input type="hidden" name={name} value={url} />
      {error && <p className="cform__error">{error}</p>}
    </div>
  );
}
