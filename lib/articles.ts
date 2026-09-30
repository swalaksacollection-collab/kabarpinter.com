import { createServerClient } from "./supabase/server";
import type { Article } from "./types";

export async function getPublishedArticles(limit = 30): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// For the homepage breaking-news ticker: "today's most important stories",
// not just the latest ones. Ranks by score first (within a recent window
// so a viral story from last week doesn't get stuck at the top forever),
// falling back to recency to break ties.
export async function getTopArticles(limit = 8, windowHours = 48): Promise<Article[]> {
  const supabase = await createServerClient();
  const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .gte("published_at", since)
    .order("score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}
