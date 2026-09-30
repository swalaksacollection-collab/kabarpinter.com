import Link from "next/link";
import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { SponsorBanner } from "@/components/SponsorBanner";
import { LiveWidget } from "@/components/LiveWidget";
import { categoryLabel } from "@/lib/categories";
import type { Article } from "@/lib/types";

export const revalidate = 60;

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "Baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

function LeadStory({ article }: { article: Article }) {
  return (
    <article className="story story--lead">
      <Link href={`/artikel/${article.slug}`}>
        {article.image_url && (
          <div className="story__media">
            {article.category_slug && (
              <span className={`story__badge story__badge--${article.category_slug}`}>
                {categoryLabel(article.category_slug)}
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image_url} alt="" />
          </div>
        )}
        <div className="story__meta">
          <span className="story__source">{article.source_name ?? "Kontributor"}</span>
          <span>•</span>
          <span>{timeAgo(article.published_at)}</span>
          <span className="story__viral">🔥 Viral Score {article.score}</span>
        </div>
        <h1 className="story__headline">{article.title}</h1>
        {article.excerpt && <p className="story__excerpt">{article.excerpt}</p>}
      </Link>
    </article>
  );
}

function SideStory({ article }: { article: Article }) {
  return (
    <article className="story story--side">
      <Link href={`/artikel/${article.slug}`}>
        {article.category_slug && (
          <span className={`story__badge story__badge--${article.category_slug}`}>
            {categoryLabel(article.category_slug)}
          </span>
        )}
        <h2 className="story__headline">{article.title}</h2>
        <div className="story__meta">
          <span>{article.source_name ?? "Kontributor"}</span>
          <span>•</span>
          <span>{timeAgo(article.published_at)}</span>
        </div>
      </Link>
    </article>
  );
}

export default async function HomePage() {
  const articles = await getPublishedArticles(30);

  if (articles.length === 0) {
    return (
      <main className="container section">
        <p style={{ textAlign: "center", color: "var(--ink-mute)" }}>
          Belum ada berita yang lolos filter 😴
        </p>
      </main>
    );
  }

  const [lead, ...rest] = articles;
  const side = rest.slice(0, 3);
  const gridArticles = rest.slice(3);

  return (
    <main>
      <div className="container">
        <SponsorBanner />
      </div>

      <section className="hero">
        <div className="container">
          <div className="hero__grid">
            <LeadStory article={lead} />
            <div className="hero__side">
              {side.map((a) => (
                <SideStory key={a.id} article={a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <LiveWidget />

      {gridArticles.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title">
                <span className="section__rule" />
                Selengkapnya
              </h2>
            </div>
            <div className="story-grid">
              {gridArticles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
