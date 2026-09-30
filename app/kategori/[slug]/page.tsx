import { notFound } from "next/navigation";
import { getArticlesByCategory } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 300;

async function getCategory(slug: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const articles = await getArticlesByCategory(slug);

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
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
