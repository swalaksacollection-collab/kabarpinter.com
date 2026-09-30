export type Category = {
  slug: string;
  label: string;
  priority: number;
};

export type Article = {
  id: string;
  source_type: "rss" | "contributor";
  status: "draft" | "submitted" | "published" | "rejected";
  title: string;
  slug: string;
  excerpt: string | null;
  // "Pokok Berita": 1-3 poin ringkas dari scripts/ringkas.py (RSS saja).
  // null = belum diproses, [] = tidak ada poin layak -> pakai excerpt.
  summary_points?: string[] | null;
  body: string | null;
  external_url: string | null;
  image_url: string | null;
  category_slug: string | null;
  region_slug: string | null;
  score: number;
  source_name: string | null;
  contributor_id: string | null;
  editor_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Embedded via the contributor_id FK (see lib/articles.ts's
  // SELECT_WITH_AUTHOR) - present for contributor-authored ("Ulasan
  // Pakar") pieces, null for RSS-aggregated ones.
  author?: { display_name: string; bio: string | null } | null;
};

export type Profile = {
  id: string;
  display_name: string;
  bio: string | null;
  role: "contributor" | "editor";
  created_at: string;
};
