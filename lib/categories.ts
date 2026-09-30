// Static display labels matching the `categories` table (migration 0006).
// Kept here too so card components can show a proper label without an
// extra query per card.
export const CATEGORY_LABELS: Record<string, string> = {
  news: "PinterNews",
  finance: "PinterFinance",
  hot: "PinterHot",
  inet: "PinterInet",
  sport: "PinterSport",
  oto: "PinterOto",
  travel: "PinterTravel",
  food: "PinterFood",
  health: "PinterHealth",
  wolipop: "PinterStyle",
  "20detik": "PinterClip",
};

export function categoryLabel(slug: string | null): string {
  if (!slug) return "Umum";
  return CATEGORY_LABELS[slug] ?? slug;
}

// For select dropdowns (e.g. the contributor submission form).
export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({
  slug,
  label,
}));
