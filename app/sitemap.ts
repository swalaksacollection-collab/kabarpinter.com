import type { MetadataRoute } from "next";
import { getSitemapArticles } from "@/lib/articles";
import { createPublicClient } from "@/lib/supabase/public";
import { REGIONS } from "@/lib/regions";
import { absoluteUrl } from "@/lib/seo";

// Rebuilt at most every 15 min (RSS ingestion runs every 30 min).
export const revalidate = 900;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "hourly" | "daily" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "hourly" },
  { path: "/daily-brief", priority: 0.8, changeFrequency: "daily" },
  { path: "/daerah", priority: 0.7, changeFrequency: "hourly" },
  { path: "/opini", priority: 0.7, changeFrequency: "daily" },
  { path: "/tentang", priority: 0.3, changeFrequency: "yearly" },
  { path: "/redaksi", priority: 0.3, changeFrequency: "yearly" },
  { path: "/pedoman", priority: 0.3, changeFrequency: "yearly" },
  { path: "/etika", priority: 0.3, changeFrequency: "yearly" },
  { path: "/kontak", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privasi", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const [{ data: categories }, articles] = await Promise.all([
    supabase.from("categories").select("slug"),
    getSitemapArticles(2000),
  ]);

  const now = new Date();

  return [
    ...STATIC_PAGES.map((p) => ({
      url: absoluteUrl(p.path),
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...(categories ?? []).map((c) => ({
      url: absoluteUrl(`/kategori/${c.slug}`),
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
    ...REGIONS.map((r) => ({
      url: absoluteUrl(`/daerah/${r.slug}`),
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(`/artikel/${a.slug}`),
      lastModified: new Date(a.updated_at ?? a.published_at ?? now),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
