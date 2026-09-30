export type ScoringInput = {
  title: string;
  publishedAt: Date;
  now: Date;
  hasImage: boolean;
};

const VIRAL_KEYWORDS = {
  tier1: ["viral", "heboh", "geger", "mengejutkan", "terungkap", "bocor", "cuan", "untung besar"],
  tier2: ["rahasia", "fakta", "inilah", "ternyata", "bikin", "tips", "cara", "peluang"],
  tier3: ["pertama", "baru", "terbaru", "eksklusif", "curhat", "cerita", "penting", "wajib"],
};

// Matches detik.com's own vertical structure (detikNews, detikFinance,
// detikHot, ...) rather than the original UMKM/career-focused taxonomy -
// see migration 0006 for the corresponding categories table remap.
export const THEME_KEYWORDS: Record<string, string[]> = {
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

const WEIGHTS = {
  viralKeyword: 25,
  recency: 20,
  themeMatch: 35,
  hasImage: 10,
  titleLength: 5,
  emotion: 5,
};

const RECENCY_MAX_HOURS = 48;
const RECENCY_PEAK_HOURS = 2;

function viralKeywordScore(title: string): number {
  const t = title.toLowerCase();
  if (VIRAL_KEYWORDS.tier1.some((k) => t.includes(k))) return WEIGHTS.viralKeyword;
  if (VIRAL_KEYWORDS.tier2.some((k) => t.includes(k))) return WEIGHTS.viralKeyword * 0.6;
  if (VIRAL_KEYWORDS.tier3.some((k) => t.includes(k))) return WEIGHTS.viralKeyword * 0.3;
  return 0;
}

function recencyScore(publishedAt: Date, now: Date): number {
  const hours = (now.getTime() - publishedAt.getTime()) / 3_600_000;
  if (hours <= RECENCY_PEAK_HOURS) return WEIGHTS.recency;
  if (hours >= RECENCY_MAX_HOURS) return 0;
  const decay = 1 - (hours - RECENCY_PEAK_HOURS) / (RECENCY_MAX_HOURS - RECENCY_PEAK_HOURS);
  return WEIGHTS.recency * Math.max(0, decay);
}

export function matchTheme(text: string): string | null {
  const t = text.toLowerCase();
  let best: { slug: string; hits: number } | null = null;
  for (const [slug, keywords] of Object.entries(THEME_KEYWORDS)) {
    const hits = keywords.filter((k) => t.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { slug, hits };
    }
  }
  return best?.slug ?? null;
}

export function scoreArticle(input: ScoringInput): number {
  let score = 0;
  score += viralKeywordScore(input.title);
  score += recencyScore(input.publishedAt, input.now);
  score += matchTheme(input.title) ? WEIGHTS.themeMatch : 0;
  score += input.hasImage ? WEIGHTS.hasImage : 0;
  score += input.title.length >= 30 && input.title.length <= 90 ? WEIGHTS.titleLength : 0;
  score += /[!?]/.test(input.title) ? WEIGHTS.emotion : 0;
  return Math.round(score);
}
