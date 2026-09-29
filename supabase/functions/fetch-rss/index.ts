import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFeedXml } from "./parse.ts";

const MIN_SCORE = 40;
const RECENCY_MAX_HOURS = 48;
const RECENCY_PEAK_HOURS = 2;

// Full keyword lists, matching lib/scoring.ts exactly (verified by that
// file's own tests). An earlier, trimmed-down copy of these lists lived
// here and caused a real production bug: against a live ANTARA feed, all
// 30 fetched items scored under MIN_SCORE=40 because the sparse keyword
// sets rarely matched ordinary (non-clickbait) Indonesian headlines,
// combined with min_score=40 requiring either a theme match (35 pts) or
// several smaller signals to stack up. Caught by manually triggering the
// deployed function and finding `inserted: 0` on real data, not by unit
// tests (which only exercised the parsing, not full-feed scoring).
const VIRAL_KEYWORDS = {
  tier1: ["viral", "heboh", "geger", "mengejutkan", "terungkap", "bocor", "cuan", "untung besar"],
  tier2: ["rahasia", "fakta", "inilah", "ternyata", "bikin", "tips", "cara", "peluang"],
  tier3: ["pertama", "baru", "terbaru", "eksklusif", "curhat", "cerita", "penting", "wajib"],
};

const THEME_KEYWORDS: Record<string, string[]> = {
  "tren-viral": ["viral", "tren", "fyp", "tiktok", "mendunia", "fenomena", "heboh", "ramai", "gen z", "milenial", "lifestyle"],
  "peluang-bisnis": ["peluang", "bisnis", "usaha", "cuan", "untung", "modal kecil", "omset", "omzet", "jualan", "reseller", "dropship", "side hustle", "wirausaha"],
  "karir-skill": ["lowongan", "kerja", "karir", "gaji", "skill", "sertifikasi", "pelatihan", "fresh graduate", "wfh", "remote", "freelance", "lpdp", "beasiswa", "magang", "cpns", "pppk", "bumn"],
  "konsumen-data": ["konsumen", "belanja", "shopee", "tokopedia", "tiktok shop", "live shopping", "preferensi", "data", "survei", "riset", "gaya hidup", "kebiasaan"],
  "ekspor-impor": ["ekspor", "impor", "china", "temu", "tiongkok", "umkm go global", "bea cukai", "tarif", "kuota", "produk lokal", "sourcing", "supplier"],
  "umkm-inspirasi": ["umkm", "umkm sukses", "pengusaha muda", "startup", "founder", "mahasiswa bisnis", "modal nekat", "bangkrut", "gagal", "comeback", "sukses", "inspiratif"],
  "ekonomi-uang": ["rupiah", "dolar", "saham", "ihsg", "bitcoin", "kripto", "inflasi", "bbm", "subsidi", "pajak", "investasi", "reksadana", "emas", "bank indonesia"],
  politik: ["prabowo", "jokowi", "gibran", "pdip", "gerindra", "dpr", "menteri", "pilkada", "demo", "kpk", "korupsi"],
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
  if (VIRAL_KEYWORDS.tier1.some((k) => t.includes(k))) score += 25;
  else if (VIRAL_KEYWORDS.tier2.some((k) => t.includes(k))) score += 25 * 0.6;
  else if (VIRAL_KEYWORDS.tier3.some((k) => t.includes(k))) score += 25 * 0.3;

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
        // A returned {error} does not throw - it must be surfaced explicitly,
        // or a failing write looks identical to "nothing new to insert".
        if (error) errors.push(`${source.name} upsert: ${error.message}`);
        else inserted++;
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
