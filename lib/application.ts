// Contributor application: shared validation + small pure helpers.
// The database re-checks the essentials in submit_contributor_application();
// this gives instant, field-level feedback in the form before that round trip.

export type ApplicationInput = {
  fullName: string;
  displayName: string;
  bio: string;
  phone: string;
  city: string;
  profession: string;
  institution: string;
  socialUrl: string;
  hasSelfie: boolean;
};

export type ApplicationErrors = Partial<
  Record<
    | "fullName"
    | "displayName"
    | "bio"
    | "phone"
    | "city"
    | "profession"
    | "institution"
    | "socialUrl"
    | "selfie",
    string
  >
>;

// Keep in sync with the CHECK constraints on contributor_applications.
export const LIMITS = {
  fullName: 120,
  displayName: 80,
  bio: 600,
  phone: 30,
  city: 80,
  profession: 120,
  institution: 160,
  socialUrl: 300,
} as const;

export const BIO_MIN = 30;

export function validateApplication(input: ApplicationInput): ApplicationErrors {
  const e: ApplicationErrors = {};
  const t = (s: string) => s.trim();

  if (t(input.fullName).length < 3) e.fullName = "Nama lengkap wajib diisi (sesuai KTP).";
  else if (input.fullName.length > LIMITS.fullName) e.fullName = `Maksimal ${LIMITS.fullName} karakter.`;

  if (t(input.displayName).length < 3)
    e.displayName = "Nama tampilan wajib diisi (contoh: dr. Andi Wijaya, Sp.PD).";
  else if (input.displayName.length > LIMITS.displayName)
    e.displayName = `Maksimal ${LIMITS.displayName} karakter.`;

  if (t(input.bio).length < BIO_MIN)
    e.bio = `Bio/kredensial minimal ${BIO_MIN} karakter — jelaskan latar belakang dan keahlian Anda.`;
  else if (input.bio.length > LIMITS.bio) e.bio = `Maksimal ${LIMITS.bio} karakter.`;

  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15 || /[a-z]/i.test(input.phone))
    e.phone = "Nomor HP/WhatsApp tidak valid.";
  else if (input.phone.length > LIMITS.phone) e.phone = `Maksimal ${LIMITS.phone} karakter.`;

  if (t(input.city).length < 2) e.city = "Kota wajib diisi.";
  if (t(input.profession).length < 2) e.profession = "Profesi wajib diisi.";
  if (t(input.institution).length < 2)
    e.institution = "Institusi/afiliasi wajib diisi (tulis \"Mandiri\" bila tidak ada).";

  const url = t(input.socialUrl);
  if (url) {
    let ok = false;
    try {
      const u = new URL(url);
      ok = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) e.socialUrl = "Tautan harus diawali http:// atau https://";
    else if (url.length > LIMITS.socialUrl) e.socialUrl = `Maksimal ${LIMITS.socialUrl} karakter.`;
  }

  if (!input.hasSelfie) e.selfie = "Foto diri wajib diunggah.";

  return e;
}

// Scale (w,h) down so the longest side is at most `max`, keeping aspect
// ratio. Used to shrink multi-megabyte phone photos before upload.
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

// Post-login redirect target. Only same-site absolute paths are allowed so
// the /auth/confirm link can never be abused as an open redirect.
export function safeNextPath(next: string | null | undefined): string {
  const fallback = "/kontributor/dashboard";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
