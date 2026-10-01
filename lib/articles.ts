import { cache } from "react";
import { createServerClient } from "./supabase/server";
import { createPublicClient } from "./supabase/public";
import type { Article } from "./types";
import { rankByCoverage } from "./trending";

// Embeds the contributor's profile (display name + bio/credential) via
// the articles.contributor_id -> profiles.id foreign key, so "Ulasan
// Pakar" pieces can show a real byline ("dr. Andi, Sp.PD - Dokter
// Spesialis...") instead of the generic source_name RSS articles use.
// null for RSS articles (no contributor_id).
const SELECT_WITH_AUTHOR = "*, author:contributor_id(display_name, bio)";

// Lean column list for LIST views (home, category, region, search, ...).
// Omits `body` (full article text, only needed on the article page and the
// editor review queue) so list responses stay small and fast.
const LIST_SELECT =
  "id, source_type, status, title, slug, excerpt, summary_points, external_url, image_url, " +
  "category_slug, region_slug, score, source_name, contributor_id, " +
  "published_at, created_at, updated_at, author:contributor_id(display_name, bio)";

// Default page size for category / region listings (previously unbounded).
const LIST_PAGE_SIZE = 30;

// ---------------------------------------------------------------------
// PUBLIC reads - use the cookie-free client so pages stay cacheable (ISR).
// ---------------------------------------------------------------------

export async function getPublishedArticles(limit = 30): Promise<Article[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_SELECT)
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
export async function getTopArticles(limit = 8, windowHours = 24): Promise<Article[]> {
  const supabase = createPublicClient();
  const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
  // Pull a wide candidate pool, then rank by how many different outlets
  // cover the same story (see lib/trending.ts) instead of keyword score.
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_SELECT)
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const pool = (data as unknown as Article[]) ?? [];
  return rankByCoverage(pool, limit).map((s) => s.article);
}

export async function getArticlesByCategory(
  categorySlug: string,
  limit = LIST_PAGE_SIZE
): Promise<Article[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_SELECT)
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

export async function getRegionalArticles(limit = 30): Promise<Article[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_SELECT)
    .eq("status", "published")
    .not("region_slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

export async function getArticlesByRegion(
  regionSlug: string,
  limit = LIST_PAGE_SIZE
): Promise<Article[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_SELECT)
    .eq("status", "published")
    .eq("region_slug", regionSlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

// "Ulasan Pakar" - published, contributor-authored pieces (as opposed to
// RSS-aggregated news), across any category/topic. Mirrors the
// /daerah pattern: a cross-cutting view independent of category_slug.
export async function getOpinionArticles(limit = 30): Promise<Article[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_SELECT)
    .eq("status", "published")
    .eq("source_type", "contributor")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Article[]) ?? [];
}

// Full row (incl. `body`) - the only public query that needs it.
// Wrapped in React's cache() so generateMetadata() and the page component
// share ONE query per request instead of hitting the database twice.
export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_AUTHOR)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Article | null;
});

// Minimal rows for sitemap.xml (slug + dates only, most recent first).
export type SitemapArticle = {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
};

export async function getSitemapArticles(limit = 2000): Promise<SitemapArticle[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as SitemapArticle[]) ?? [];
}

// ---------------------------------------------------------------------
// SESSION-DEPENDENT reads - must keep the cookie-based server client.
// ---------------------------------------------------------------------

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
