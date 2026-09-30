// News thumbnails arrive from RSS at tiny sizes (e.g. Tribunnews 148x99,
// ANTARA 255x170, detik 360 px wide) but are displayed at 350-700 CSS px -
// twice that on retina phones - so they look blurry. Some CDNs serve larger
// variants of the same photo just by changing the size in the URL; this
// rewrites those URLs at render time (no database change needed).
//
// Signed CDNs (Tribunnews, Liputan6/kly) reject any modified URL, so they are
// deliberately left alone here.

// ---------------------------------------------------------------------------
// Hosts whose photos we do NOT display. Tribunnews' terms of use (checked
// 2026-10-01) allow its content (incl. photos) only for personal,
// non-commercial use, forbid automated extraction, and forbid embedding it on
// other sites without written permission. Kabarpinter is a commercial site, and
// Tribun's RSS thumbnail is only 148x99 (blurry) anyway. To show Tribunnews
// photos again, get written permission first, then remove the entry below.
// Titles/excerpts/links to the source are unaffected by this gate.
// ---------------------------------------------------------------------------
const BLOCKED_IMAGE_HOSTS: RegExp[] = [/(^|\.)tribunnews\.com$/i];

// The single gate every <img>/og:image/JSON-LD image must pass. False when
// there is nothing to show (null/empty/unparseable) or the host is blocked.
export function isImageAllowed(url: string | null | undefined): boolean {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url.replace(/&amp;/g, "&")).hostname;
  } catch {
    return false;
  }
  return !BLOCKED_IMAGE_HOSTS.some((re) => re.test(host));
}

export type ImageSize = "card" | "hero";

// Target width (px) to request per display context.
const ANTARA_TARGET: Record<ImageSize, number> = { card: 800, hero: 1200 };
const DETIK_TARGET: Record<ImageSize, number> = { card: 720, hero: 1080 };

// ANTARA's /cache/WxH/ only serves 3:2 sizes (verified 255x170, 800x533, 1200x800).
const ANTARA_RE = /^(https?:\/\/(?:cdn|img)\.antaranews\.com\/cache\/)(\d+)x(\d+)(\/.*)$/;

export function upgradeImageUrl(
  url: string | null | undefined,
  size: ImageSize
): string | null {
  if (url == null) return null;
  // Feeds store HTML-escaped URLs ("...?w=360&amp;q=90"); in a src attribute
  // that becomes a literal "amp;q=90" and the quality parameter is ignored.
  const clean = url.replace(/&amp;/g, "&");

  const antara = ANTARA_RE.exec(clean);
  if (antara) {
    const [, prefix, w, h, rest] = antara;
    const width = Number(w);
    const height = Number(h);
    const target = ANTARA_TARGET[size];
    const is32 = Math.abs(width / height - 1.5) < 0.02;
    if (is32 && width < target) {
      return `${prefix}${target}x${Math.round((target * 2) / 3)}${rest}`;
    }
    return clean;
  }

  if (/^https?:\/\/akcdn\.detik\.net\.id\//.test(clean)) {
    const target = DETIK_TARGET[size];
    return clean.replace(/([?&]w=)(\d+)/, (match, lead: string, current: string) =>
      Number(current) < target ? `${lead}${target}` : match
    );
  }

  return clean;
}

// ---------------------------------------------------------------------------
// srcset: let the BROWSER pick the size for its own screen density, so a 3x
// phone gets a genuinely sharper photo while a 1x desktop does not download
// the big file. Only sizes each CDN was verified to serve are listed:
//   ANTARA  800x533 and 1200x800 only (400x267 / 1600x1067+ return HTTP 400)
//   detik   w=360, 720, 1080, 1440   (w=2160 returns a *smaller* image)
// Signed CDNs (Tribunnews, Liputan6/kly) have no variants -> undefined, and
// the caller falls back to the plain src.
// ---------------------------------------------------------------------------
const ANTARA_WIDTHS = [800, 1200] as const;
const DETIK_WIDTHS = [360, 720, 1080, 1440] as const;

export function imageSrcSet(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const clean = url.replace(/&amp;/g, "&");

  const antara = ANTARA_RE.exec(clean);
  if (antara) {
    const [, prefix, w, h, rest] = antara;
    if (Math.abs(Number(w) / Number(h) - 1.5) >= 0.02) return undefined;
    return ANTARA_WIDTHS.map(
      (width) => `${prefix}${width}x${Math.round((width * 2) / 3)}${rest} ${width}w`
    ).join(", ");
  }

  if (/^https?:\/\/akcdn\.detik\.net\.id\//.test(clean) && /([?&])w=\d+/.test(clean)) {
    return DETIK_WIDTHS.map(
      (width) => `${clean.replace(/([?&]w=)\d+/, `$1${width}`)} ${width}w`
    ).join(", ");
  }

  return undefined;
}

// `sizes` hints so the browser knows how wide the image is actually shown.
// Keep in step with the layout CSS (card grid / hero column / article column).
//   card    phones: 112px thumbnail in a row; 641-760: 2 columns; 761-1024: 3 columns
//   hero    homepage lead story (full width on small screens, ~700px column on desktop)
//   article article page photo
export const IMAGE_SIZES = {
  card: "(max-width: 640px) 112px, (max-width: 760px) 46vw, (max-width: 1024px) 30vw, 390px",
  hero: "(max-width: 900px) 100vw, 700px",
  article: "(max-width: 740px) 100vw, 700px",
} as const;

// ---------------------------------------------------------------------------
// Best width (px) we can obtain for a photo - used to pick a sharp lead story.
//   upgradable CDNs  -> the largest size imageSrcSet() offers
//   signed CDNs      -> the fixed size encoded in the URL (Tribun 148, kly 673)
//   contributor uploads (Supabase storage) -> full-size photos, trusted
//   anything else    -> 0 (unknown, lowest priority)
// ---------------------------------------------------------------------------
export function maxImageWidth(url: string | null | undefined): number {
  if (!url || !isImageAllowed(url)) return 0;
  const clean = url.replace(/&amp;/g, "&");

  if (ANTARA_RE.test(clean)) return ANTARA_WIDTHS[ANTARA_WIDTHS.length - 1];
  if (/^https?:\/\/akcdn\.detik\.net\.id\//.test(clean)) {
    return DETIK_WIDTHS[DETIK_WIDTHS.length - 1];
  }
  if (/\.supabase\.co\/storage\//.test(clean)) return 1600;

  const fixed = /\/(\d+)x\d+\//.exec(clean);
  return fixed ? Number(fixed[1]) : 0;
}
