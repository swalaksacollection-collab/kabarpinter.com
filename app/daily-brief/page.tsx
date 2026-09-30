import Link from "next/link";
import { getPublishedArticles, getOpinionArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { categoryLabel } from "@/lib/categories";

export const revalidate = 300;

export default async function DailyBriefPage() {
  const [articles, [featuredOpini]] = await Promise.all([
    getPublishedArticles(50),
    getOpinionArticles(1),
  ]);
  // Opinion pieces get their own featured slot at the top, so they
  // shouldn't also compete for a spot in the regular top-5 news grid.
  const news = articles.filter((a) => a.source_type !== "contributor");
  const top5 = [...news].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <main className="section">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Daily Brief
          </h1>
        </div>
        <p style={{ color: "var(--ink-mute)", marginTop: "-16px", marginBottom: "24px" }}>
          5 hal yang perlu Anda tahu hari ini
        </p>

        {featuredOpini && (
          <Link href={`/artikel/${featuredOpini.slug}`} className="brief-featured">
            <div className="story__badges">
              <span className="story__badge story__badge--opini">✍️ Ulasan Pakar</span>
              {featuredOpini.category_slug && (
                <span className={`story__badge story__badge--${featuredOpini.category_slug}`}>
                  {categoryLabel(featuredOpini.category_slug)}
                </span>
              )}
            </div>
            <h2 className="brief-featured__title">{featuredOpini.title}</h2>
            {featuredOpini.excerpt && (
              <p className="brief-featured__excerpt">{featuredOpini.excerpt}</p>
            )}
            <span className="brief-featured__byline">
              {featuredOpini.author?.display_name ?? featuredOpini.source_name ?? "Kontributor"}
            </span>
          </Link>
        )}

        {top5.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada berita untuk brief hari ini.</p>
        ) : (
          <div className="story-grid">
            {top5.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
