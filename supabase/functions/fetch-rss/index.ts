import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFeedXml } from "./parse.ts";

const MIN_SCORE = 40;
const RECENCY_MAX_HOURS = 48;
const RECENCY_PEAK_HOURS = 2;

const THEME_KEYWORDS: Record<string, string[]> = {
  "tren-viral": ["viral", "tren", "fyp", "tiktok", "mendunia", "fenomena", "heboh", "ramai"],
  "peluang-bisnis": ["peluang", "bisnis", "usaha", "cuan", "untung", "modal kecil", "reseller"],
  "karir-skill": ["lowongan", "kerja", "karir", "gaji", "skill", "freelance", "cpns"],
  "konsumen-data": ["konsumen", "belanja", "shopee", "tokopedia", "survei"],
  "ekspor-impor": ["ekspor", "impor", "tiongkok", "bea cukai", "supplier"],
  "umkm-inspirasi": ["umkm", "pengusaha muda", "startup", "bangkrut", "sukses"],
  "ekonomi-uang": ["rupiah", "saham", "ihsg", "inflasi", "investasi"],
  politik: ["prabowo", "dpr", "menteri", "pilkada", "korupsi"],
};

function matchTheme(text: string): string | null {
  const t = text.toLowerCase();
  let best: { slug: string; hits: number } | null = null;
  for (const [slug, keywords] of Object.entries(THEME_KEYWORDS)) {
    const hits = keywords.filter((k) => t.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { slug, hits };
  }
  return best?.slug ?? null;
}

function scoreItem(title: string, pubDate: string | null, hasImage: boolean): number {
  let score = 0;
  const t = title.toLowerCase();
  if (["viral", "heboh", "cuan"].some((k) => t.includes(k))) score += 25;
  else if (["tips", "cara", "peluang"].some((k) => t.includes(k))) score += 15;

  if (pubDate) {
    const hours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
    if (hours <= RECENCY_PEAK_HOURS) score += 20;
    else if (hours < RECENCY_MAX_HOURS) {
      score += 20 * (1 - (hours - RECENCY_PEAK_HOURS) / (RECENCY_MAX_HOURS - RECENCY_PEAK_HOURS));
    }
  }

  if (matchTheme(title)) score += 35;
  if (hasImage) score += 10;
  if (title.length >= 30 && title.length <= 90) score += 5;
  if (/[!?]/.test(title)) score += 5;
  return Math.round(score);
}

function slugify(title: string, link: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  // `articles.slug` is UNIQUE, but two different articles (different
  // external_url) can title-slugify identically. Append a short,
  // deterministic hash of the link so the slug stays unique without an
  // extra existence query.
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 31 + link.charCodeAt(i)) | 0;
  }
  const shortHash = Math.abs(hash).toString(36).slice(0, 6);
  return `${base}-${shortHash}`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  let inserted = 0;
  const errors: string[] = [];

  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.feed_url);
      const xml = await res.text();
      const items = parseFeedXml(xml);

      for (const item of items) {
        const score = scoreItem(item.title, item.pubDate, !!item.imageUrl);
        if (score < MIN_SCORE) continue;

        const category = source.category_slug ?? matchTheme(item.title);

        const { error } = await supabase.from("articles").upsert(
          {
            source_type: "rss",
            status: "published",
            title: item.title,
            slug: slugify(item.title, item.link),
            excerpt: null,
            external_url: item.link,
            image_url: item.imageUrl,
            category_slug: category,
            score,
            source_name: source.name,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          },
          { onConflict: "external_url", ignoreDuplicates: true }
        );
        if (!error) inserted++;
      }
    } catch (err) {
      // Per Global Constraints: one dead/malformed source must not block the rest.
      errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
  }

  return new Response(JSON.stringify({ inserted, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
