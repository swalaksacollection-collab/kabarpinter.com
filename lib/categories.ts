// Static display labels matching the `categories` table (migration 0006).
// Kept here too so card components can show a proper label without an
// extra query per card.
export const CATEGORY_LABELS: Record<string, string> = {
  news: "detikNews",
  finance: "detikFinance",
  hot: "detikHot",
  inet: "detikInet",
  sport: "detikSport",
  oto: "detikOto",
  travel: "detikTravel",
  food: "detikFood",
  health: "detikHealth",
  wolipop: "Wolipop",
  "20detik": "20detik",
};

export function categoryLabel(slug: string | null): string {
  if (!slug) return "Umum";
  return CATEGORY_LABELS[slug] ?? slug;
}
