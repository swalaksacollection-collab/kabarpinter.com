import { createServerClient } from "./supabase/server";
import type { Article } from "./types";

// Embeds the contributor's profile (display name + bio/credential) via
// the articles.contributor_id -> profiles.id foreign key, so "Ulasan
// Pakar" pieces can show a real byline ("dr. Andi, Sp.PD - Dokter
// Spesialis...") instead of the generic source_name RSS articles use.
// null for RSS articles (no contributor_id).
const SELECT_WITH_AUTHOR = "*, author:contributor_id(display_name, bio)";

export async function getPublishedArticles(limit = 30): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
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
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "published")
    .gte("published_at", since)
    .order("score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

export async function getRegionalArticles(limit = 30): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "published")
    .not("region_slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

export async function getArticlesByRegion(regionSlug: string): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "published")
    .eq("region_slug", regionSlug)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

// "Ulasan Pakar" - published, contributor-authored pieces (as opposed to
// RSS-aggregated news), across any category/topic. Mirrors the
// /daerah pattern: a cross-cutting view independent of category_slug.
export async function getOpinionArticles(limit = 30): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "published")
    .eq("source_type", "contributor")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Article | null;
}

// A contributor's own articles (any status) - used by their dashboard.
// Relies on the "articles: contributor can read own" RLS policy, so the
// caller must be querying as that authenticated user (browser/session
// client), not the service role.
export async function getMyArticles(userId: string): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("contributor_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// The editor review queue - relies on the "articles: editors can read
// all" RLS policy, so this only returns rows when called as a session
// with role='editor'; otherwise it comes back empty rather than erroring.
export async function getSubmittedArticles(): Promise<Article[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("status", "submitted")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}
