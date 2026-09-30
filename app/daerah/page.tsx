import Link from "next/link";
import { getRegionalArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { REGIONS } from "@/lib/regions";

export const revalidate = 300;

export default async function DaerahPage() {
  const articles = await getRegionalArticles(30);

  return (
    <main className="section">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Daerah
          </h1>
        </div>

        <div className="region-picker">
          {REGIONS.map((r) => (
            <Link key={r.slug} href={`/daerah/${r.slug}`} className="region-picker__item">
              {r.label}
            </Link>
          ))}
        </div>

        {articles.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada berita daerah.</p>
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
