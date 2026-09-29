import type { Article } from "./types";

/**
 * Next.js's `searchParams` types a query param as `string | string[] |
 * undefined` - a duplicated param (?q=a&q=b) arrives as an array. Calling
 * `.trim()` on that array throws, so a duplicated `q` crashed the whole
 * search page with a 500 before this existed.
 */
export function normalizeQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function filterArticles(articles: Article[], rawQuery: string): Article[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return articles;
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      (a.excerpt ?? "").toLowerCase().includes(query)
  );
}
