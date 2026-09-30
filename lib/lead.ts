import { maxImageWidth } from "./images";
import type { Article } from "./types";

// Photo sharpness that still looks good in the big homepage slot (~700 CSS px,
// roughly double that on retina screens).
const SHARP_ENOUGH = 1000;

// Choose the homepage lead story. Freshness stays the priority: only the
// newest `window` articles are considered, and the newest one is kept when its
// photo is sharp enough. Otherwise take the first article whose photo can be
// served sharply; failing that, the one with the best available photo.
// (Liputan6 photos are fixed at 673px and Tribunnews at 148px - shown in the
// hero they look blurry, so they lose to an ANTARA/detik photo a few hours older.)
export function pickLead(articles: Article[], window = 6): Article | undefined {
  const candidates = articles.slice(0, window);
  if (candidates.length === 0) return undefined;

  const sharp = candidates.find((a) => maxImageWidth(a.image_url) >= SHARP_ENOUGH);
  if (sharp) return sharp;

  let best = candidates[0];
  let bestWidth = maxImageWidth(best.image_url);
  for (const a of candidates.slice(1)) {
    const w = maxImageWidth(a.image_url);
    if (w > bestWidth) {
      best = a;
      bestWidth = w;
    }
  }
  return best;
}
