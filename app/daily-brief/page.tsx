import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 300;

export default async function DailyBriefPage() {
  const articles = await getPublishedArticles(50);
  const top5 = [...articles].sort((a, b) => b.score - a.score).slice(0, 5);

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
