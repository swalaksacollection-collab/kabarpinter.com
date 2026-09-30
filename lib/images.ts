// News thumbnails arrive from RSS at tiny sizes (e.g. Tribunnews 148x99,
// ANTARA 255x170, detik 360 px wide) but are displayed at 350-700 CSS px -
// twice that on retina phones - so they look blurry. Some CDNs serve larger
// variants of the same photo just by changing the size in the URL; this
// rewrites those URLs at render time (no database change needed).
//
// Signed CDNs (Tribunnews, Liputan6/kly) reject any modified URL, so they are
// deliberately left alone here.

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
