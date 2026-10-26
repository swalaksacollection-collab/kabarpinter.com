// Access areas an editor can be granted by the super admin. Admin-only areas
// (pelamar, kontributor, filter, popup, iklan, tim) are never grantable here:
// the database only lets role 'admin' touch those tables.

export const PERMISSIONS = [
  { key: "impor", label: "Impor Berita", hint: "Tulis ulang dari link, edit, terbitkan berita redaksi" },
  { key: "review", label: "Review Tulisan", hint: "Setujui atau tolak tulisan kontributor" },
  { key: "ulasan", label: "Ulasan Pakar", hint: "Edit, sembunyikan, hapus ulasan pakar" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
const KEYS: string[] = PERMISSIONS.map((p) => p.key);

export function cleanPermissions(input: unknown): Permission[] {
  const list = Array.isArray(input) ? input : [];
  return [...new Set(list.map(String))].filter((k): k is Permission => KEYS.includes(k));
}

export function hasPermission(
  role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
  key: Permission
): boolean {
  if (role === "admin") return true;
  return role === "editor" && (permissions ?? []).includes(key);
}

const COMMON = ["password", "admin123", "12345678", "123456789", "qwertyuiop", "kabarpinter", "indonesia"];

// Password rules for staff accounts (Supabase enforces its own minimum too).
export function validateNewPassword(password: string, email = ""): string | null {
  if (password.length < 12) return "Password minimal 12 karakter.";
  if (password.length > 72) return "Password maksimal 72 karakter.";
  const p = password.toLowerCase();
  if (COMMON.some((c) => p.includes(c))) return "Password terlalu mudah ditebak. Hindari kata umum.";
  if (email && p.includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) {
    return "Password tidak boleh memuat nama email Anda.";
  }
  if (new Set(password).size < 5) return "Password terlalu monoton. Campurkan huruf, angka, dan simbol.";
  return null;
}
