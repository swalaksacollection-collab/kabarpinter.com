import type { Article } from "./types";

export function filterArticles(articles: Article[], rawQuery: string): Article[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return articles;
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      (a.excerpt ?? "").toLowerCase().includes(query)
  );
}
