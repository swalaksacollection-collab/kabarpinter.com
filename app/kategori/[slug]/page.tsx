import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getArticlesByCategory } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 300;

// Pre-render every category at build time; ISR (revalidate above) keeps
// them fresh. Unknown slugs still resolve on demand and 404 via notFound().
export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("categories").select("slug");
  return (data ?? []).map((c) => ({ slug: c.slug as string }));
}

// cache(): generateMetadata() and the page share one query per request.
const getCategory = cache(async (slug: string) => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Kategori tidak ditemukan" };
  const description = `Berita terbaru ${category.label} di Kabarpinter.com — dikurasi dari sumber tepercaya dan diperbarui berkala.`;
  return {
    title: category.label,
    description,
    alternates: { canonical: `/kategori/${slug}` },
    openGraph: { title: category.label, description, url: `/kategori/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Independent queries - run them in parallel instead of back-to-back.
  const [category, articles] = await Promise.all([
    getCategory(slug),
    getArticlesByCategory(slug),
  ]);
  if (!category) notFound();

  return (
    <main className="section">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            {category.label}
          </h1>
        </div>
        {articles.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada berita di kategori ini.</p>
        ) : (
          <div className="story-grid">
            {articles.map((article, i) => (
              <ArticleCard key={article.id} article={article} priority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
