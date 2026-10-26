"use server";

// "Impor Berita": paste links (e.g. forwarded on WhatsApp) -> we read the pages,
// an AI editor merges + rewrites them into ONE original article, photos are
// saved to our own storage, and the result is a DRAFT for staff to check and
// publish. Staff only; writes go through the caller's own Supabase session.

import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { getStaffContext } from "@/lib/staff";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { isImageAllowed } from "@/lib/images";
import { isOwnMediaUrl } from "@/lib/media";
import { isOwnBodyImage } from "@/lib/body";
import { slugify } from "@/lib/slug";
import { aiConfigured, writeArticle, type PhotoForAi, type SourceForAi } from "@/lib/ai-article";
import {
  type DraftArticle,
  buildBody,
  extractUrls,
  isPrivateIp,
  isPublicHttpUrl,
  isUnreadableHost,
  parseArticleHtml,
} from "@/lib/importer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BASE = "/redaksi/impor";
const UA = "Mozilla/5.0 (compatible; KabarpinterBot/1.0; +https://kabarpinter.com)";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const done = (path: string, code: string): never => redirect(`${path}?ok=${encodeURIComponent(code)}`);
const fail = (path: string, message: string): never =>
  redirect(`${path}?error=${encodeURIComponent(message.slice(0, 300))}`);

async function requireStaff() {
  const ctx = await getStaffContext();
  if (!ctx.isStaff) redirect("/kontributor/dashboard");
  return ctx;
}

// Fetch a public URL, re-checking every redirect hop and the resolved IPs so
// pasted links can never reach our internal network.
async function safeFetch(url: string, maxBytes: number): Promise<Response> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    if (!isPublicHttpUrl(current)) throw new Error("Alamat tidak diizinkan.");
    const host = new URL(current).hostname;
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
      throw new Error("Alamat tidak diizinkan.");
    }
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,image/*;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > maxBytes) throw new Error("Berkas terlalu besar.");
    return res;
  }
  throw new Error("Terlalu banyak pengalihan.");
}

type Page = { url: string; siteName: string; title: string; text: string; images: { url: string; alt: string }[] };

async function readPage(url: string): Promise<Page | null> {
  try {
    const res = await safeFetch(url, 3_000_000);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 2_500_000);
    const p = parseArticleHtml(html, url);
    if (p.text.length < 200) return null;
    return { url, ...p };
  } catch {
    return null;
  }
}

async function savePhoto(
  supabase: Awaited<ReturnType<typeof getStaffContext>>["supabase"],
  imageUrl: string
): Promise<string | null> {
  try {
    if (!isImageAllowed(imageUrl)) return null;
    const res = await safeFetch(imageUrl, 12_000_000);
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length > 12_000_000) return null;
    const img = sharp(input, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    if (!meta.width || meta.width < 500) return null; // thumbnails / icons
    const out = await img
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const path = `illustrations/${randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("site-media")
      .upload(path, out, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) return null;
    return supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function importFromLinks(formData: FormData) {
  const { supabase } = await requireStaff();
  if (!aiConfigured()) fail(BASE, "Penulis AI belum aktif: isi OPENROUTER_API_KEY di pengaturan Vercel.");
  const raw = str(formData, "links");
  if (str(formData, "photo_ok") !== "1") {
    fail(BASE, "Centang dulu pernyataan izin foto (atau hapus foto lewat halaman edit).");
  }

  const urls = extractUrls(raw);
  if (urls.length === 0) fail(BASE, "Tidak ada link yang ditemukan. Tempel link berita (https://...).");

  const skipped: string[] = [];
  const readable = urls.filter((u) => {
    if (isUnreadableHost(u) || !isPublicHttpUrl(u)) {
      skipped.push(new URL(u).hostname);
      return false;
    }
    return true;
  });
  const pages = (await Promise.all(readable.map(readPage))).filter((p): p is Page => p !== null);
  if (pages.length === 0) {
    fail(
      BASE,
      "Tidak ada halaman berita yang bisa dibaca. Link TikTok/Instagram/YouTube tidak bisa dibaca, tempel link berita dari situs medianya."
    );
  }

  // Photo candidates (first = the page's og:image), saved to our own bucket.
  const candidates: { url: string; alt: string; source: string }[] = [];
  for (const p of pages) {
    for (const im of p.images.slice(0, 3)) {
      if (!candidates.some((c) => c.url === im.url)) candidates.push({ ...im, source: p.siteName });
    }
  }
  const saved = await Promise.all(candidates.slice(0, 6).map((c) => savePhoto(supabase, c.url)));
  const photoUrls: string[] = [];
  const photoMeta: PhotoForAi[] = [];
  saved.forEach((url, i) => {
    if (url && !photoUrls.includes(url)) {
      photoUrls.push(url);
      photoMeta.push({ source: candidates[i].source, alt: candidates[i].alt });
    }
  });

  const sources: SourceForAi[] = pages.map((p) => ({
    url: p.url,
    siteName: p.siteName,
    title: p.title,
    text: p.text,
  }));

  let d: DraftArticle;
  try {
    d = await writeArticle(sources, photoMeta);
  } catch (e) {
    return fail(BASE, e instanceof Error ? e.message : "Penulis AI gagal.");
  }

  const row = {
    source_type: "redaksi" as const,
    status: "draft" as const,
    title: d.title,
    excerpt: d.excerpt || null,
    body: buildBody(d, photoUrls),
    image_url: d.heroPhoto !== null ? photoUrls[d.heroPhoto] ?? null : null,
    category_slug: d.category,
    source_name: "Redaksi Kabarpinter.com",
    editor_note: `Sumber: ${pages.map((p) => `${p.siteName} (${p.url})`).join(" | ")}`.slice(0, 1500),
    score: 60,
  };
  const baseSlug = slugify(d.title, new Set());
  let { data, error } = await supabase.from("articles").insert({ ...row, slug: baseSlug }).select("id").maybeSingle();
  if (error && /duplicate|unique/i.test(error.message)) {
    ({ data, error } = await supabase
      .from("articles")
      .insert({ ...row, slug: slugify(d.title, new Set([baseSlug])) })
      .select("id")
      .maybeSingle());
  }
  if (error || !data) fail(BASE, error?.message ?? "Gagal menyimpan draf.");

  revalidatePath(BASE);
  const note = skipped.length ? `&skip=${encodeURIComponent([...new Set(skipped)].join(", "))}` : "";
  redirect(`${BASE}/${data!.id}?ok=draf-dibuat${note}`);
}

// ------------------------------------------------------------------ edit/publish
function validateBodyImages(body: string): string | null {
  for (const line of body.split("\n")) {
    const m = /^!\[[^\]]*\]\(([^)\s]+)\)$/.exec(line.trim());
    if (m && !isOwnBodyImage(m[1], SUPABASE_URL)) {
      return "Foto di dalam isi harus berasal dari unggahan situs ini.";
    }
  }
  return null;
}

export async function saveRedaksiArticle(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const back = `${BASE}/${encodeURIComponent(id)}`;
  const title = str(formData, "title");
  const excerpt = str(formData, "excerpt");
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  const category = str(formData, "category_slug");
  const imageUrl = str(formData, "image_url");

  if (!title || title.length > 200) fail(back, "Judul wajib diisi (maks 200 karakter).");
  if (excerpt.length > 400) fail(back, "Ringkasan maksimal 400 karakter.");
  if (body.length > 50000) fail(back, "Isi terlalu panjang.");
  if (category && !CATEGORY_OPTIONS.some((c) => c.slug === category)) fail(back, "Kategori tidak valid.");
  if (imageUrl && !isOwnMediaUrl(imageUrl, SUPABASE_URL)) fail(back, "Alamat foto tidak valid.");
  const bad = validateBodyImages(body);
  if (bad) fail(back, bad);

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
    .eq("source_type", "redaksi")
    .select("slug")
    .maybeSingle();
  if (error) fail(back, error.message);
  if (!data) fail(back, "Berita tidak ditemukan.");
  revalidatePath(`/artikel/${data!.slug}`);
  revalidatePath("/");
  done(back, "berita-disimpan");
}

export async function setRedaksiStatus(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const back = `${BASE}/${encodeURIComponent(id)}`;
  const status = str(formData, "status");
  if (!["published", "draft"].includes(status)) fail(back, "Status tidak valid.");

  // Publishing stamps "now" so the story lands at the top of the homepage.
  const patch =
    status === "published" ? { status, published_at: new Date().toISOString() } : { status };
  const { data, error } = await supabase
    .from("articles")
    .update(patch)
    .eq("id", id)
    .eq("source_type", "redaksi")
    .select("slug")
    .maybeSingle();
  if (error) fail(back, error.message);
  if (!data) fail(back, "Berita tidak ditemukan.");
  revalidatePath(`/artikel/${data!.slug}`);
  revalidatePath("/");
  revalidatePath(BASE);
  done(back, status === "published" ? "berita-diterbitkan" : "berita-disembunyikan");
}

export async function deleteRedaksiArticle(formData: FormData) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", str(formData, "id"))
    .eq("source_type", "redaksi")
    .select("slug")
    .maybeSingle();
  if (error) fail(BASE, error.message);
  if (data) revalidatePath(`/artikel/${data.slug}`);
  revalidatePath("/");
  revalidatePath(BASE);
  done(BASE, "berita-dihapus");
}
