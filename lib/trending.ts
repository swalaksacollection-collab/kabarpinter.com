import type { Article } from "./types";

// Ranks stories by how widely they are covered, as a proxy for "viral /
// most talked about": when several different outlets publish a headline
// about the same event (e.g. a new Kapolri being installed), that event
// is the day's big story, regardless of keyword-based score.

const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "dalam", "ini", "itu",
  "akan", "atau", "oleh", "juga", "sudah", "telah", "tak", "tidak", "bisa", "usai",
  "soal", "saat", "ada", "jadi", "kata", "hingga", "sebut", "karena", "agar", "antara",
  "para", "ia", "nya", "kini", "hari", "baru", "lebih", "capai", "naik", "turun",
]);

function tokenize(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

function sameStory(a: Set<string>, b: Set<string>): boolean {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  if (shared < 3) return false;
  // Overlap coefficient: tolerant of one outlet's longer headline.
  return shared / Math.min(a.size, b.size) >= 0.5;
}

export type TrendingStory = { article: Article; coverage: number };

export function rankByCoverage(articles: Article[], limit: number): TrendingStory[] {
  const rss = articles.filter((a) => a.source_type !== "contributor");
  const tokens = rss.map((a) => tokenize(a.title));

  // Union-find over articles whose headlines describe the same story.
  const parent = rss.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rss.length; i++) {
    for (let j = i + 1; j < rss.length; j++) {
      if (sameStory(tokens[i], tokens[j])) parent[find(j)] = find(i);
    }
  }

  const clusters = new Map<number, Article[]>();
  rss.forEach((a, i) => {
    const root = find(i);
    clusters.set(root, [...(clusters.get(root) ?? []), a]);
  });

  const byScoreThenNewest = (x: Article, y: Article) =>
    y.score - x.score || Date.parse(y.published_at ?? "") - Date.parse(x.published_at ?? "");

  const stories: TrendingStory[] = [...clusters.values()].map((members) => {
    const sources = new Set(members.map((m) => m.source_name ?? m.id));
    return { article: [...members].sort(byScoreThenNewest)[0], coverage: sources.size };
  });

  return stories
    .sort((x, y) => y.coverage - x.coverage || byScoreThenNewest(x.article, y.article))
    .slice(0, limit);
}
