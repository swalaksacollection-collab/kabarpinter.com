import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFeedXml } from "./parse.ts";

const MIN_SCORE = 40;
const RECENCY_MAX_HOURS = 48;
const RECENCY_PEAK_HOURS = 2;
const FETCH_TIMEOUT_MS = 10_000;
const THROTTLE_MINUTES = 5;
const USER_AGENT = "KabarpinterBot/1.0 (+https://kabarpinter.com)";

const VIRAL_KEYWORDS = {
  tier1: ["viral", "heboh", "geger", "mengejutkan", "terungkap", "bocor", "cuan", "untung besar"],
  tier2: ["rahasia", "fakta", "inilah", "ternyata", "bikin", "tips", "cara", "peluang"],
  tier3: ["pertama", "baru", "terbaru", "eksklusif", "curhat", "cerita", "penting", "wajib"],
};

// Matches detik.com's own vertical structure - kept in sync with
// lib/scoring.ts's THEME_KEYWORDS (see migration 0006 for the
// corresponding categories table remap). Deliberately duplicated rather
// than shared across the Node/Deno boundary - see Task 17's ledger entry
// in the original plan for why.
const THEME_KEYWORDS: Record<string, string[]> = {
  news: ["politik", "pemerintah", "dpr", "menteri", "presiden", "hukum", "kriminal", "bencana", "kebakaran", "korupsi", "prabowo", "jokowi", "gibran", "pilkada", "kpk", "demo"],
  finance: ["ekonomi", "bisnis", "usaha", "saham", "rupiah", "ihsg", "investasi", "pajak", "bank", "keuangan", "harga", "dolar", "bitcoin", "kripto", "inflasi", "bbm", "subsidi", "umkm", "startup", "peluang", "cuan", "untung"],
  hot: ["artis", "selebriti", "gosip", "skandal", "seleb", "film", "konser", "musisi", "aktor", "aktris", "viral", "tren", "fyp", "heboh", "ramai"],
  inet: ["teknologi", "gadget", "aplikasi", "internet", "smartphone", "handphone", "komputer", "software", "kecerdasan buatan"],
  sport: ["sepak bola", "pertandingan", "atlet", "liga", "timnas", "olahraga", "juara", "medali", "turnamen", "bola"],
  oto: ["mobil", "motor", "otomotif", "kendaraan", "sim", "test drive", "pabrikan"],
  travel: ["wisata", "liburan", "destinasi", "hotel", "tiket pesawat", "pantai", "gunung", "traveling", "turis"],
  food: ["kuliner", "makanan", "resep", "restoran", "masakan", "jajanan", "minuman", "chef"],
  health: ["kesehatan", "penyakit", "dokter", "rumah sakit", "vaksin", "obat", "gizi", "virus"],
  wolipop: ["fashion", "kecantikan", "wanita", "gaya hidup", "kosmetik", "skincare", "parenting", "kehamilan"],
  "20detik": ["video", "tayangan video", "siaran langsung", "live streaming"],
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

function isTooOld(pubDate: string | null): boolean {
  if (!pubDate) return false;
  const parsed = new Date(pubDate).getTime();
  if (Number.isNaN(parsed)) return false;
  const hours = (Date.now() - parsed) / 3_600_000;
  return hours >= RECENCY_MAX_HOURS;
}

// `new Date(unparseable).toISOString()` throws a RangeError. That throw
// was previously uncaught at the point of use, inside the per-source
// try/catch that wraps the whole item loop - so one item with a
// malformed pubDate aborted every remaining item from that source, not
// just itself. Isolate the parse so a bad date degrades to "now" instead.
function toIsoOrNow(pubDate: string | null): string {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function slugify(title: string, link: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
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

  // This function has no per-caller authentication (verify_jwt is off,
  // since it's invoked by pg_cron with no user session, and the anon
  // key needed to satisfy verify_jwt is itself public - it would add no
  // real protection). Instead, self-throttle: if a run completed very
  // recently, skip real work entirely rather than re-fetching all 6
  // upstream feeds. This bounds the cost of the endpoint being publicly
  // reachable (its URL is in a public GitHub repo) without needing any
  // secret-management infrastructure this project doesn't have.
  const { data: lastRun } = await supabase
    .from("articles")
    .select("created_at")
    .eq("source_type", "rss")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRun) {
    const minutesSinceLastRun = (Date.now() - new Date(lastRun.created_at).getTime()) / 60_000;
    if (minutesSinceLastRun < THROTTLE_MINUTES) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "throttled", minutesSinceLastRun }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  if (sourcesError) {
    return new Response(
      JSON.stringify({ inserted: 0, errors: [`sources query: ${sourcesError.message}`] }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  let inserted = 0;
  const errors: string[] = [];

  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.feed_url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        errors.push(`${source.name}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      // A dead feed doesn't always fail at the HTTP level - Kontan's feed
      // URL now serves a normal 200 HTML page instead of XML. res.ok alone
      // can't catch that; check the content actually looks like a feed
      // before silently reporting "0 items" as if nothing were wrong.
      if (!xml.includes("<item")) {
        errors.push(`${source.name}: response did not look like an RSS/XML feed`);
        continue;
      }
      const items = parseFeedXml(xml);

      for (const item of items) {
        if (isTooOld(item.pubDate)) continue;

        const score = scoreItem(item.title, item.pubDate, !!item.imageUrl);
        if (score < MIN_SCORE) continue;

        const category = source.category_slug ?? matchTheme(item.title);

        const { data: upserted, error } = await supabase
          .from("articles")
          .upsert(
            {
              source_type: "rss",
              status: "published",
              title: item.title,
              slug: slugify(item.title, item.link),
              excerpt: item.excerpt,
              external_url: item.link,
              image_url: item.imageUrl,
              category_slug: category,
              score,
              source_name: source.name,
              published_at: toIsoOrNow(item.pubDate),
            },
            { onConflict: "external_url", ignoreDuplicates: true }
          )
          .select("id");

        if (error) errors.push(`${source.name} upsert: ${error.message}`);
        // ignoreDuplicates makes a duplicate a no-op (no error, no
        // returned row) rather than an update - only count it as
        // inserted when a row actually came back, so `inserted` means
        // "new articles this run", not "items that didn't error".
        else if (upserted && upserted.length > 0) inserted++;
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
