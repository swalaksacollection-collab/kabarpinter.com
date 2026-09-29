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
  body: string | null;
  external_url: string | null;
  image_url: string | null;
  category_slug: string | null;
  score: number;
  source_name: string | null;
  contributor_id: string | null;
  editor_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
