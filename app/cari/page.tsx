import { getPublishedArticles } from "@/lib/articles";
import { filterArticles, normalizeQueryParam } from "@/lib/search";
import { ArticleCard } from "@/components/ArticleCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = normalizeQueryParam(params.q);
  const all = await getPublishedArticles(100);
  const results = filterArticles(all, q);

  return (
    <main className="section">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Cari Berita
          </h1>
        </div>
        <form action="/cari" style={{ marginBottom: "24px" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari judul atau topik..."
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "10px 16px",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
            }}
          />
        </form>
        {results.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>
            {q.trim() ? `Tidak ada hasil untuk "${q}".` : "Belum ada berita."}
          </p>
        ) : (
          <div className="story-grid">
            {results.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
