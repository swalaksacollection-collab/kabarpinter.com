// Single source of truth for site-wide identity used by SEO metadata,
// the sitemap, robots.txt and structured data.
export const SITE_URL = "https://kabarpinter.com";
export const SITE_NAME = "Kabarpinter.com";
export const SITE_TAGLINE = "Tren, Peluang, Karir & UMKM Indonesia";
export const SITE_DESCRIPTION =
  "Portal berita tren viral, kebijakan, peluang karir, dan cerita UMKM Indonesia.";

// Fallback share image for pages/articles that have no photo of their own.
export const DEFAULT_OG_IMAGE = {
  url: "/android-chrome-512x512.png",
  width: 512,
  height: 512,
  alt: SITE_NAME,
};
