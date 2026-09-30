import { getOpinionArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 300;

export default async function OpiniPage() {
  const articles = await getOpinionArticles(30);

  return (
    <main className="section">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            ✍️ Ulasan Pakar
          </h1>
        </div>
        <p style={{ color: "var(--ink-mute)", marginTop: -20, marginBottom: 32, maxWidth: "60ch" }}>
          Ulasan dan opini dari dokter, akademisi, praktisi, dan figur publik —
          ditinjau tim redaksi sebelum tayang.
        </p>

        {articles.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>Belum ada ulasan pakar yang tayang.</p>
        ) : (
          <div className="story-grid">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
