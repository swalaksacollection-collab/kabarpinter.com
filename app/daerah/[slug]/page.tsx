import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticlesByRegion } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { REGIONS, isKnownRegion, regionLabel } from "@/lib/regions";

export const revalidate = 300;

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isKnownRegion(slug)) notFound();

  const articles = await getArticlesByRegion(slug);

  return (
    <main className="section">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            Daerah — {regionLabel(slug)}
          </h1>
        </div>

        <div className="region-picker">
          {REGIONS.map((r) => (
            <Link
              key={r.slug}
              href={`/daerah/${r.slug}`}
              className={`region-picker__item${r.slug === slug ? " region-picker__item--active" : ""}`}
            >
              {r.label}
            </Link>
          ))}
        </div>

        {articles.length === 0 ? (
          <p style={{ color: "var(--ink-mute)" }}>
            Belum ada berita untuk daerah {regionLabel(slug)}.
          </p>
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
