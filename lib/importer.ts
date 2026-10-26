// Pure helpers for "Impor Berita": find links in pasted WhatsApp text, decide
// whether a URL is safe to fetch from our server, pull readable text + photo
// candidates out of an article page, and turn the model's structured answer
// into an article body. No network or database access here (all unit-tested).

export const MAX_LINKS = 6;
export const MAX_SOURCE_CHARS = 9000;

// ---------------------------------------------------------------- links
export function extractUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  const out: string[] = [];
  for (const raw of found) {
    const url = raw.replace(/[).,;:!?\]}»”’]+$/u, "");
    try {
      const u = new URL(url);
      u.hash = "";
      const clean = u.toString();
      if (!out.includes(clean)) out.push(clean);
    } catch {
      // ignore malformed
    }
  }
  return out.slice(0, MAX_LINKS);
}

// Hosts that only serve a JS app / video, so there is nothing to read.
export function isUnreadableHost(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return /(^|\.)(tiktok\.com|instagram\.com|facebook\.com|fb\.watch|youtube\.com|youtu\.be|x\.com|twitter\.com|wa\.me|whatsapp\.com)$/.test(h);
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------- SSRF guard
export function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

// Syntactic check before any DNS lookup: https/http, a real hostname.
export function isPublicHttpUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || h === "localhost") return false;
  if (/\.(local|internal|localhost|lan|home)$/.test(h)) return false;
  if (/^[\d.]+$/.test(h) || h.startsWith("[")) return false; // IP literals
  return true;
}

// ---------------------------------------------------------------- HTML parsing
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function metaContent(html: string, key: string): string | null {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*?content=["']([^"']*)["']`, "i").exec(html);
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${key}["']`, "i").exec(html);
  const v = (a ?? b)?.[1];
  return v ? decodeEntities(v).trim() : null;
}

const BAD_IMAGE = /(logo|icon|avatar|sprite|pixel|tracking|banner|iklan|\badv?s?\b|emoji|placeholder|loading|\.svg|\.gif|^data:)/i;

export type ParsedPage = {
  title: string;
  siteName: string;
  description: string;
  text: string;
  images: { url: string; alt: string }[];
};

export function parseArticleHtml(html: string, baseUrl: string): ParsedPage {
  const ogTitle = metaContent(html, "og:title");
  const docTitle = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = decodeEntities((ogTitle ?? docTitle ?? "").replace(/\s+/g, " ")).trim();
  let siteName = metaContent(html, "og:site_name") ?? "";
  if (!siteName) {
    try {
      siteName = new URL(baseUrl).hostname.replace(/^www\./, "");
    } catch {
      siteName = "";
    }
  }
  const description = metaContent(html, "og:description") ?? metaContent(html, "description") ?? "";

  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe)\b[\s\S]*?<\/\1>/gi, " ");

  const paragraphs: string[] = [];
  for (const m of cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (t.length < 50) continue;
    if (/^(baca juga|baca selengkapnya|simak juga|artikel terkait|follow|ikuti)/i.test(t)) continue;
    if (!paragraphs.includes(t)) paragraphs.push(t);
  }
  let text = paragraphs.join("\n");
  if (text.length > MAX_SOURCE_CHARS) text = text.slice(0, MAX_SOURCE_CHARS);

  const images: { url: string; alt: string }[] = [];
  const add = (src: string | null | undefined, alt = "") => {
    if (!src) return;
    let abs: string;
    try {
      abs = new URL(decodeEntities(src.trim()), baseUrl).toString();
    } catch {
      return;
    }
    if (!/^https?:/i.test(abs) || BAD_IMAGE.test(abs)) return;
    if (!images.some((i) => i.url === abs)) images.push({ url: abs, alt: decodeEntities(alt).trim() });
  };
  add(metaContent(html, "og:image"), title);
  for (const m of cleaned.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = /\b(?:data-src|data-original|src)=["']([^"']+)["']/i.exec(tag)?.[1];
    const alt = /\balt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    add(src, alt);
  }
  return { title, siteName, description, text, images: images.slice(0, 6) };
}

// ---------------------------------------------------------------- model output
export type DraftBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "photo"; photo: number; caption: string };

export type DraftArticle = {
  title: string;
  excerpt: string;
  category: string;
  heroPhoto: number | null;
  blocks: DraftBlock[];
};

const oneLine = (s: unknown, max: number) =>
  String(s ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// Never trust the model's JSON: coerce and validate every field.
export function normalizeDraft(raw: unknown, categories: string[], photoCount: number): DraftArticle {
  if (!raw || typeof raw !== "object") throw new Error("Jawaban penulis AI tidak valid.");
  const r = raw as Record<string, unknown>;
  const title = oneLine(r.title, 200);
  if (!title) throw new Error("Penulis AI tidak menghasilkan judul.");
  const blocksRaw = Array.isArray(r.blocks) ? r.blocks : [];
  const blocks: DraftBlock[] = [];
  for (const b of blocksRaw) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    if (o.type === "p" || o.type === "h") {
      const text = oneLine(o.text, 2000).replace(/^#+\s*/, "");
      if (text) blocks.push({ type: o.type, text });
    } else if (o.type === "photo") {
      const n = Number(o.photo);
      if (Number.isInteger(n) && n >= 0 && n < photoCount) {
        blocks.push({ type: "photo", photo: n, caption: oneLine(o.caption, 160).replace(/[\[\]()]/g, "") });
      }
    }
  }
  if (!blocks.some((b) => b.type === "p")) throw new Error("Penulis AI tidak menghasilkan isi berita.");
  const hero = Number(r.hero_photo);
  const category = String(r.category_slug ?? "");
  return {
    title,
    excerpt: oneLine(r.excerpt, 400),
    category: categories.includes(category) ? category : "news",
    heroPhoto: Number.isInteger(hero) && hero >= 0 && hero < photoCount ? hero : photoCount > 0 ? 0 : null,
    blocks,
  };
}

// Body markup understood by lib/body.ts. The hero photo is shown above the
// article, so it is not repeated in the body.
export function buildBody(draft: DraftArticle, photoUrls: string[]): string {
  const lines: string[] = [];
  const used = new Set<number>();
  for (const b of draft.blocks) {
    if (b.type === "p") lines.push(b.text);
    else if (b.type === "h") lines.push(`## ${b.text}`);
    else if (b.photo !== draft.heroPhoto && !used.has(b.photo) && photoUrls[b.photo]) {
      used.add(b.photo);
      lines.push(`![${b.caption || "Foto: Ist"}](${photoUrls[b.photo]})`);
    }
  }
  return lines.join("\n");
}
