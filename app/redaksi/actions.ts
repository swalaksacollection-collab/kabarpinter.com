"use server";

// Server actions for the staff area (/redaksi/*). Every action:
//   1. checks the caller's role (friendly redirect if not allowed),
//   2. validates all input again (never trust the form),
//   3. writes through the caller's own Supabase session, so RLS / SECURITY
//      DEFINER functions in the database remain the real enforcement.
// Outcome is reported with ?ok=<code> / ?error=<message> on the redirect.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { isOwnMediaUrl, isSiteMediaUrl } from "@/lib/media";
import { safeHttpUrl } from "@/lib/popup";
import { wibInputToIso } from "@/lib/wib";
import {
  AD_SLOT_KEYS,
  isValidPublisherId,
  isValidSlotId,
  normalizePublisherId,
} from "@/lib/ads";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type Sb = Awaited<ReturnType<typeof createServerClient>>;

async function requireRole(level: "admin" | "staff"): Promise<Sb> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kontributor/masuk");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = data?.role;
  const allowed = level === "admin" ? role === "admin" : role === "admin" || role === "editor";
  if (!allowed) redirect("/kontributor/dashboard");
  return supabase;
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function done(path: string, code: string): never {
  redirect(`${path}?ok=${encodeURIComponent(code)}`);
}
function fail(path: string, message: string, extra = ""): never {
  redirect(`${path}?error=${encodeURIComponent(message.slice(0, 200))}${extra}`);
}

// ---------------------------------------------------------------- kontributor
const P_KONTRIBUTOR = "/redaksi/kontributor";

export async function setContributorAvatar(formData: FormData) {
  const supabase = await requireRole("admin");
  const id = str(formData, "id");
  const url = str(formData, "url");
  if (url && !isSiteMediaUrl(url, SUPABASE_URL)) fail(P_KONTRIBUTOR, "Alamat foto tidak valid.");
  const { error } = await supabase.rpc("admin_set_contributor_avatar", {
    target: id,
    url: url || null,
  });
  if (error) fail(P_KONTRIBUTOR, error.message);
  revalidatePath("/opini");
  revalidatePath(P_KONTRIBUTOR);
  done(P_KONTRIBUTOR, url ? "foto-disimpan" : "foto-dihapus");
}

export async function setContributorSuspended(formData: FormData) {
  const supabase = await requireRole("admin");
  const id = str(formData, "id");
  const suspend = str(formData, "suspend") === "1";
  const { error } = await supabase.rpc("admin_set_contributor_suspended", {
    target: id,
    flag: suspend,
  });
  if (error) fail(P_KONTRIBUTOR, error.message);
  revalidatePath(P_KONTRIBUTOR);
  done(P_KONTRIBUTOR, suspend ? "dinonaktifkan" : "diaktifkan");
}

// --------------------------------------------------------------------- filter
const P_FILTER = "/redaksi/filter";

export async function addFilterRule(formData: FormData) {
  const supabase = await requireRole("admin");
  const ruleType = str(formData, "rule_type");
  const value = str(formData, "value");
  const action = str(formData, "action");

  if (!["banned_word", "min_words", "max_links"].includes(ruleType)) fail(P_FILTER, "Jenis aturan tidak valid.");
  if (!["flag", "reject"].includes(action)) fail(P_FILTER, "Aksi tidak valid.");
  if (!value || value.length > 100) fail(P_FILTER, "Nilai wajib diisi (maks 100 karakter).");
  if (ruleType !== "banned_word" && !/^\d{1,5}$/.test(value)) fail(P_FILTER, "Nilai harus berupa angka.");

  const { error } = await supabase
    .from("filter_rules")
    .insert({ rule_type: ruleType, value, action, enabled: true });
  if (error) fail(P_FILTER, error.message);
  revalidatePath(P_FILTER);
  done(P_FILTER, "aturan-ditambah");
}

export async function toggleFilterRule(formData: FormData) {
  const supabase = await requireRole("admin");
  const { error } = await supabase
    .from("filter_rules")
    .update({ enabled: str(formData, "enabled") === "1" })
    .eq("id", str(formData, "id"));
  if (error) fail(P_FILTER, error.message);
  revalidatePath(P_FILTER);
  done(P_FILTER, "aturan-diubah");
}

export async function deleteFilterRule(formData: FormData) {
  const supabase = await requireRole("admin");
  const { error } = await supabase.from("filter_rules").delete().eq("id", str(formData, "id"));
  if (error) fail(P_FILTER, error.message);
  revalidatePath(P_FILTER);
  done(P_FILTER, "aturan-dihapus");
}

// ---------------------------------------------------------------------- popup
const P_POPUP = "/redaksi/popup";

export async function savePopup(formData: FormData) {
  const supabase = await requireRole("admin");
  const id = str(formData, "id");
  const back = id ? `&id=${encodeURIComponent(id)}` : "&baru=1";

  const title = str(formData, "title");
  const body = str(formData, "body");
  const imageUrl = str(formData, "image_url");
  const linkRaw = str(formData, "link_url");
  const target = str(formData, "target_paths") || "semua";
  const max = Number(str(formData, "max_per_session") || "1");
  const startsAt = wibInputToIso(str(formData, "starts_at"));
  const endsAt = wibInputToIso(str(formData, "ends_at"));

  if (!title || title.length > 120) fail(P_POPUP, "Judul wajib diisi (maks 120 karakter).", back);
  if (body.length > 600) fail(P_POPUP, "Teks maksimal 600 karakter.", back);
  if (target.length > 300) fail(P_POPUP, "Daftar halaman target terlalu panjang.", back);
  if (!Number.isInteger(max) || max < 1 || max > 20) fail(P_POPUP, "Batas per sesi harus 1-20.", back);
  if (imageUrl && !isSiteMediaUrl(imageUrl, SUPABASE_URL)) fail(P_POPUP, "Alamat gambar tidak valid.", back);
  const link = linkRaw ? safeHttpUrl(linkRaw) : null;
  if (linkRaw && !link) fail(P_POPUP, "Tautan harus diawali http:// atau https://", back);
  if (str(formData, "starts_at") && !startsAt) fail(P_POPUP, "Waktu mulai tidak valid.", back);
  if (str(formData, "ends_at") && !endsAt) fail(P_POPUP, "Waktu selesai tidak valid.", back);
  if (startsAt && endsAt && endsAt < startsAt) fail(P_POPUP, "Waktu selesai tidak boleh sebelum waktu mulai.", back);

  const row = {
    title,
    body,
    image_url: imageUrl || null,
    link_url: link,
    starts_at: startsAt,
    ends_at: endsAt,
    target_paths: target,
    max_per_session: max,
    enabled: str(formData, "enabled") === "1",
  };
  const { error } = id
    ? await supabase.from("popups").update(row).eq("id", id)
    : await supabase.from("popups").insert(row);
  if (error) fail(P_POPUP, error.message, back);
  revalidatePath(P_POPUP);
  done(P_POPUP, "popup-disimpan");
}

export async function togglePopup(formData: FormData) {
  const supabase = await requireRole("admin");
  const { error } = await supabase
    .from("popups")
    .update({ enabled: str(formData, "enabled") === "1" })
    .eq("id", str(formData, "id"));
  if (error) fail(P_POPUP, error.message);
  revalidatePath(P_POPUP);
  done(P_POPUP, "popup-diubah");
}

export async function deletePopup(formData: FormData) {
  const supabase = await requireRole("admin");
  const { error } = await supabase.from("popups").delete().eq("id", str(formData, "id"));
  if (error) fail(P_POPUP, error.message);
  revalidatePath(P_POPUP);
  done(P_POPUP, "popup-dihapus");
}

// ----------------------------------------------------------------------- iklan
const P_IKLAN = "/redaksi/iklan";

export async function saveAdSettings(formData: FormData) {
  const supabase = await requireRole("admin");
  const publisher = normalizePublisherId(str(formData, "publisher_id"));
  const enabled = str(formData, "enabled") === "1";
  if (publisher && !isValidPublisherId(publisher)) {
    fail(P_IKLAN, "ID penerbit tidak valid. Contoh: ca-pub-1234567890123456");
  }
  if (enabled && !publisher) fail(P_IKLAN, "Isi ID penerbit AdSense sebelum mengaktifkan iklan.");
  const { error } = await supabase
    .from("ad_settings")
    .update({ publisher_id: publisher || null, enabled })
    .eq("id", 1);
  if (error) fail(P_IKLAN, error.message);
  revalidatePath("/", "layout");
  done(P_IKLAN, "pengaturan-disimpan");
}

export async function saveAdSlot(formData: FormData) {
  const supabase = await requireRole("admin");
  const key = str(formData, "slot_key");
  const slotId = str(formData, "ad_slot_id");
  const enabled = str(formData, "enabled") === "1";
  if (!(AD_SLOT_KEYS as readonly string[]).includes(key)) fail(P_IKLAN, "Slot tidak dikenal.");
  if (slotId && !isValidSlotId(slotId)) fail(P_IKLAN, "ID slot iklan harus 6-20 digit angka.");
  if (enabled && !slotId) fail(P_IKLAN, "Isi ID slot iklan sebelum mengaktifkan slot ini.");
  const { error } = await supabase
    .from("ad_slots")
    .update({ ad_slot_id: slotId || null, enabled })
    .eq("slot_key", key);
  if (error) fail(P_IKLAN, error.message);
  revalidatePath("/", "layout");
  done(P_IKLAN, "slot-disimpan");
}

// --------------------------------------------------------------- ulasan pakar
const P_ULASAN = "/redaksi/ulasan";

export async function updateOpinion(formData: FormData) {
  const supabase = await requireRole("staff");
  const id = str(formData, "id");
  const back = `/redaksi/ulasan/${encodeURIComponent(id)}`;

  const title = str(formData, "title");
  const excerpt = str(formData, "excerpt");
  const body = str(formData, "body");
  const category = str(formData, "category_slug");
  const imageUrl = str(formData, "image_url");

  if (!title || title.length > 200) fail(back, "Judul wajib diisi (maks 200 karakter).");
  if (excerpt.length > 400) fail(back, "Ringkasan maksimal 400 karakter.");
  if (body.length > 50000) fail(back, "Isi terlalu panjang (maks 50.000 karakter).");
  if (category && !CATEGORY_OPTIONS.some((c) => c.slug === category)) fail(back, "Kategori tidak valid.");
  if (imageUrl && !isOwnMediaUrl(imageUrl, SUPABASE_URL)) fail(back, "Alamat foto tidak valid.");

  const { data, error } = await supabase
    .from("articles")
    .update({
      title,
      excerpt: excerpt || null,
      body: body || null,
      category_slug: category || null,
      image_url: imageUrl || null,
    })
    .eq("id", id)
    .eq("source_type", "contributor")
    .select("slug")
    .maybeSingle();
  if (error) fail(back, error.message);
  if (!data) fail(back, "Ulasan tidak ditemukan.");

  revalidatePath(`/artikel/${data.slug}`);
  revalidatePath("/opini");
  revalidatePath(P_ULASAN);
  done(back, "ulasan-disimpan");
}

export async function setOpinionStatus(formData: FormData) {
  const supabase = await requireRole("staff");
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["published", "draft"].includes(status)) fail(P_ULASAN, "Status tidak valid.");

  const { data: current } = await supabase
    .from("articles")
    .select("slug, published_at")
    .eq("id", id)
    .eq("source_type", "contributor")
    .maybeSingle();
  if (!current) fail(P_ULASAN, "Ulasan tidak ditemukan.");

  const { error } = await supabase
    .from("articles")
    .update({
      status,
      published_at: status === "published" ? (current.published_at ?? new Date().toISOString()) : current.published_at,
    })
    .eq("id", id);
  if (error) fail(P_ULASAN, error.message);

  revalidatePath(`/artikel/${current.slug}`);
  revalidatePath("/opini");
  revalidatePath("/");
  done(P_ULASAN, status === "published" ? "diterbitkan" : "disembunyikan");
}

export async function deleteOpinion(formData: FormData) {
  const supabase = await requireRole("staff");
  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", str(formData, "id"))
    .eq("source_type", "contributor")
    .select("slug")
    .maybeSingle();
  if (error) fail(P_ULASAN, error.message);
  if (data) revalidatePath(`/artikel/${data.slug}`);
  revalidatePath("/opini");
  revalidatePath("/");
  done(P_ULASAN, "dihapus");
}
