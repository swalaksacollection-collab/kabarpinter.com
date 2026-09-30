"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  validateApplication,
  fitWithin,
  LIMITS,
  BIO_MIN,
  type ApplicationErrors,
} from "@/lib/application";

export type ApplicationValues = {
  fullName: string;
  displayName: string;
  bio: string;
  phone: string;
  city: string;
  profession: string;
  institution: string;
  socialUrl: string;
};

const MAX_SIDE = 1280;

// Phone photos are 3-8 MB (iPhones often HEIC). Decode, honour EXIF
// orientation, scale down and re-encode as JPEG (~200-400 KB) in the browser.
async function toJpegBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85)
  );
}

export function ApplicationForm({
  userId,
  initial,
  existingSelfieUrl,
  hasExistingSelfie,
  isResubmission,
}: {
  userId: string;
  initial: ApplicationValues;
  existingSelfieUrl: string | null;
  hasExistingSelfie: boolean;
  isResubmission: boolean;
}) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<ApplicationValues>(initial);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Release the object URL when it is replaced / on unmount.
  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  function set<K extends keyof ApplicationValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await toJpegBlob(file);
      setSelfieBlob(blob);
      setSelfiePreview(URL.createObjectURL(blob));
      setErrors((prev) => ({ ...prev, selfie: undefined }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        selfie: "Foto tidak dapat dibaca. Coba ambil foto ulang atau pilih foto lain.",
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const found = validateApplication({
      ...values,
      hasSelfie: selfieBlob !== null || hasExistingSelfie,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSubmitError("Ada isian yang belum lengkap. Periksa kolom yang bertanda merah.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const path = `${userId}/selfie.jpg`;

      if (selfieBlob) {
        const { error } = await supabase.storage
          .from("contributor-verification")
          .upload(path, selfieBlob, { upsert: true, contentType: "image/jpeg" });
        if (error) throw error;
      }

      const { error: saveError } = await supabase.from("contributor_applications").upsert(
        {
          user_id: userId,
          full_name: values.fullName.trim(),
          display_name: values.displayName.trim(),
          bio: values.bio.trim(),
          phone: values.phone.trim(),
          city: values.city.trim(),
          profession: values.profession.trim(),
          institution: values.institution.trim(),
          social_url: values.socialUrl.trim() || null,
          selfie_path: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (saveError) throw saveError;

      const { error: submitErr } = await supabase.rpc("submit_contributor_application");
      if (submitErr) throw submitErr;

      router.refresh();
    } catch (err) {
      const message = (err as { message?: string })?.message;
      setSubmitError(message || "Gagal mengirim pengajuan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const preview = selfiePreview ?? existingSelfieUrl;

  return (
    <form onSubmit={handleSubmit} className="cform" noValidate>
      <fieldset className="cform__group">
        <legend>Data diri</legend>

        <label className="cform__label">
          Nama lengkap (sesuai KTP)
          <input
            className="cform__input"
            value={values.fullName}
            maxLength={LIMITS.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            autoComplete="name"
          />
          {errors.fullName && <span className="cform__error">{errors.fullName}</span>}
        </label>

        <label className="cform__label">
          Nomor HP / WhatsApp
          <input
            className="cform__input"
            type="tel"
            inputMode="tel"
            value={values.phone}
            maxLength={LIMITS.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="0812-3456-7890"
            autoComplete="tel"
          />
          {errors.phone && <span className="cform__error">{errors.phone}</span>}
        </label>

        <label className="cform__label">
          Kota domisili
          <input
            className="cform__input"
            value={values.city}
            maxLength={LIMITS.city}
            onChange={(e) => set("city", e.target.value)}
            autoComplete="address-level2"
          />
          {errors.city && <span className="cform__error">{errors.city}</span>}
        </label>
      </fieldset>

      <fieldset className="cform__group">
        <legend>Profil penulis (tampil publik setelah disetujui)</legend>

        <label className="cform__label">
          Nama tampilan
          <input
            className="cform__input"
            value={values.displayName}
            maxLength={LIMITS.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="mis. dr. Andi Wijaya, Sp.PD"
          />
          {errors.displayName && <span className="cform__error">{errors.displayName}</span>}
        </label>

        <label className="cform__label">
          Profesi / bidang keahlian
          <input
            className="cform__input"
            value={values.profession}
            maxLength={LIMITS.profession}
            onChange={(e) => set("profession", e.target.value)}
            placeholder="mis. Dokter spesialis penyakit dalam"
          />
          {errors.profession && <span className="cform__error">{errors.profession}</span>}
        </label>

        <label className="cform__label">
          Institusi / afiliasi
          <input
            className="cform__input"
            value={values.institution}
            maxLength={LIMITS.institution}
            onChange={(e) => set("institution", e.target.value)}
            placeholder='mis. RS Hasan Sadikin (tulis "Mandiri" bila tidak ada)'
          />
          {errors.institution && <span className="cform__error">{errors.institution}</span>}
        </label>

        <label className="cform__label">
          Bio &amp; kredensial
          <textarea
            className="cform__textarea"
            rows={5}
            value={values.bio}
            maxLength={LIMITS.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Latar belakang pendidikan, pengalaman, dan keahlian Anda."
          />
          <span className="cform__hint">
            {values.bio.trim().length}/{LIMITS.bio} karakter (minimal {BIO_MIN})
          </span>
          {errors.bio && <span className="cform__error">{errors.bio}</span>}
        </label>

        <label className="cform__label">
          Tautan profil / portofolio (opsional)
          <input
            className="cform__input"
            type="url"
            inputMode="url"
            value={values.socialUrl}
            maxLength={LIMITS.socialUrl}
            onChange={(e) => set("socialUrl", e.target.value)}
            placeholder="https://linkedin.com/in/nama-anda"
          />
          {errors.socialUrl && <span className="cform__error">{errors.socialUrl}</span>}
        </label>
      </fieldset>

      <fieldset className="cform__group">
        <legend>Foto diri (verifikasi identitas)</legend>
        <p className="cform__hint">
          Ambil foto wajah Anda dengan kamera HP: wajah jelas menghadap kamera, cahaya cukup,
          tanpa kacamata hitam atau masker. Foto ini <strong>hanya dilihat admin</strong> untuk
          verifikasi dan tidak ditampilkan di situs.
        </p>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pratinjau foto diri" className="selfie-preview" />
        )}

        <div className="cform__row">
          <button
            type="button"
            className="btn-outline"
            onClick={() => cameraRef.current?.click()}
          >
            📷 {preview ? "Ambil ulang selfie" : "Ambil selfie"}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => galleryRef.current?.click()}
          >
            atau pilih dari galeri
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={handlePick}
        />
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={handlePick} />
        {errors.selfie && <span className="cform__error">{errors.selfie}</span>}
      </fieldset>

      {submitError && <p className="cform__error">{submitError}</p>}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Mengirim…" : isResubmission ? "Kirim Ulang Pengajuan" : "Kirim Pengajuan"}
      </button>
    </form>
  );
}
