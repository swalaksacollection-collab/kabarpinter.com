import type { Article } from "./types";
import { SITE_URL, SITE_NAME } from "./site";
import { upgradeImageUrl, isImageAllowed } from "./images";

// Turn a site path into a fully-qualified URL (leaves absolute URLs alone).
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path === "/" || path === "") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Clean text for <meta description>/og:description: strip tags, collapse
// whitespace, and trim to `max` chars on a word boundary with an ellipsis.
export function describeText(text: string | null | undefined, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const room = max - 1; // leave space for the ellipsis
  const cut = clean.slice(0, room + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : clean.slice(0, room);
  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}

// schema.org NewsArticle for an article page. RSS-aggregated pieces credit
// the original outlet as author and link back via isBasedOn; contributor
// ("Ulasan Pakar") pieces credit the named expert as a Person.
export function articleJsonLd(article: Article): Record<string, unknown> {
  const url = absoluteUrl(`/artikel/${article.slug}`);
  const isContributor = article.source_type === "contributor";

  const author = isContributor && article.author?.display_name
    ? { "@type": "Person", name: article.author.display_name }
    : { "@type": "Organization", name: article.source_name ?? SITE_NAME };

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: describeText(article.title, 110),
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at ?? article.published_at ?? article.created_at,
    author,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/android-chrome-512x512.png") },
    },
    mainEntityOfPage: url,
    url,
  };

  const description = describeText(article.excerpt);
  if (description) ld.description = description;
  if (article.image_url && isImageAllowed(article.image_url)) ld.image = [upgradeImageUrl(article.image_url, "hero") ?? article.image_url];
  if (!isContributor && article.external_url) ld.isBasedOn = article.external_url;

  return ld;
}

// JSON-LD goes inside a <script> tag: escape "<" so text like "</script>"
// in a headline can never terminate the tag early (XSS-safe).
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
