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

export const THEME_KEYWORDS: Record<string, string[]> = {
  "tren-viral": ["viral", "tren", "fyp", "tiktok", "mendunia", "fenomena", "heboh", "ramai", "gen z", "milenial", "lifestyle"],
  "peluang-bisnis": ["peluang", "bisnis", "usaha", "cuan", "untung", "modal kecil", "omset", "omzet", "jualan", "reseller", "dropship", "side hustle", "wirausaha"],
  "karir-skill": ["lowongan", "kerja", "karir", "gaji", "skill", "sertifikasi", "pelatihan", "fresh graduate", "wfh", "remote", "freelance", "lpdp", "beasiswa", "magang", "cpns", "pppk", "bumn"],
  "konsumen-data": ["konsumen", "belanja", "shopee", "tokopedia", "tiktok shop", "live shopping", "preferensi", "data", "survei", "riset", "gaya hidup", "kebiasaan"],
  "ekspor-impor": ["ekspor", "impor", "china", "temu", "tiongkok", "umkm go global", "bea cukai", "tarif", "kuota", "produk lokal", "sourcing", "supplier"],
  "umkm-inspirasi": ["umkm", "umkm sukses", "pengusaha muda", "startup", "founder", "mahasiswa bisnis", "modal nekat", "bangkrut", "gagal", "comeback", "sukses", "inspiratif"],
  "ekonomi-uang": ["rupiah", "dolar", "saham", "ihsg", "bitcoin", "kripto", "inflasi", "bbm", "subsidi", "pajak", "investasi", "reksadana", "emas", "bank indonesia"],
  politik: ["prabowo", "jokowi", "gibran", "pdip", "gerindra", "dpr", "menteri", "pilkada", "demo", "kpk", "korupsi"],
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
