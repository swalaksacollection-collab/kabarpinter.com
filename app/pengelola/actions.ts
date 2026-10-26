"use server";

// Pengelola (admin/redaksi) accounts: password sign-up for invited emails and
// the super admin's team management. Every write goes through the caller's own
// session; RLS and SECURITY DEFINER functions in the database are the real gate.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/staff";
import { cleanPermissions, validateNewPassword } from "@/lib/permissions";

const TIM = "/pengelola/tim";
const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const go = (path: string, key: "ok" | "error", value: string): never =>
  redirect(`${path}?${key}=${encodeURIComponent(value.slice(0, 250))}`);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Sign-up is only possible for an email that the super admin invited.
export async function registerStaff(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const back = "/pengelola/masuk";
  if (!EMAIL_RE.test(email)) go(back, "error", "Alamat email tidak valid.");
  const weak = validateNewPassword(password, email);
  if (weak) go(back, "error", weak);

  const supabase = await createServerClient();
  const { data: invited } = await supabase.rpc("staff_invite_pending", { p_email: email });
  if (!invited) {
    go(back, "error", "Email ini belum diundang sebagai pengelola. Minta super admin mengundang Anda.");
  }
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already")) go(back, "error", "Email ini sudah terdaftar. Gunakan Masuk (atau Lupa password).");
    go(back, "error", "Pendaftaran gagal: " + error.message);
  }
  go(back, "ok", "daftar");
}

async function requireSuperAdmin() {
  const ctx = await getStaffContext();
  if (!ctx.isAdmin) redirect("/pengelola");
  return ctx;
}

export async function inviteStaff(formData: FormData) {
  const { supabase, user } = await requireSuperAdmin();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "display_name");
  const role = str(formData, "role");
  const perms = cleanPermissions(formData.getAll("permissions"));
  if (!EMAIL_RE.test(email) || email.length > 200) go(TIM, "error", "Alamat email tidak valid.");
  if (name.length < 2 || name.length > 80) go(TIM, "error", "Nama wajib diisi (2-80 karakter).");
  if (!["editor", "admin"].includes(role)) go(TIM, "error", "Peran tidak valid.");

  const { error } = await supabase.from("staff_invites").upsert({
    email,
    display_name: name,
    role,
    permissions: role === "editor" ? perms : [],
    invited_by: user.id,
    claimed_at: null,
  });
  if (error) go(TIM, "error", error.message);
  revalidatePath(TIM);
  go(TIM, "ok", "diundang");
}

export async function removeInvite(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase.from("staff_invites").delete().eq("email", str(formData, "email"));
  if (error) go(TIM, "error", error.message);
  revalidatePath(TIM);
  go(TIM, "ok", "undangan-dihapus");
}

export async function updateStaffAccess(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const role = str(formData, "role");
  if (!["contributor", "editor", "admin"].includes(role)) go(TIM, "error", "Peran tidak valid.");
  const { error } = await supabase.rpc("admin_set_staff", {
    target: str(formData, "id"),
    new_role: role,
    new_perms: cleanPermissions(formData.getAll("permissions")),
  });
  if (error) go(TIM, "error", error.message);
  revalidatePath(TIM);
  go(TIM, "ok", "akses-disimpan");
}
