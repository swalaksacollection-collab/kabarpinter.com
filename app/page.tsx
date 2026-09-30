import Link from "next/link";
import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { SponsorBanner } from "@/components/SponsorBanner";
import { LiveWidget } from "@/components/LiveWidget";
import { PokokBerita } from "@/components/PokokBerita";
import { categoryLabel } from "@/lib/categories";
import { upgradeImageUrl, imageSrcSet, IMAGE_SIZES } from "@/lib/images";
import { pickLead } from "@/lib/lead";
import type { Article } from "@/lib/types";

export const revalidate = 300;

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "Baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

function StoryBadges({ article }: { article: Article }) {
  return (
    <>
      {article.source_type === "contributor" && (
        <span className="story__badge story__badge--opini">✍️ Ulasan Pakar</span>
      )}
      {article.category_slug && (
        <span className={`story__badge story__badge--${article.category_slug}`}>
          {categoryLabel(article.category_slug)}
        </span>
      )}
    </>
  );
}

function LeadStory({ article }: { article: Article }) {
  const byline = article.author?.display_name ?? article.source_name ?? "Kontributor";
  return (
    <article className="story story--lead">
      <Link href={`/artikel/${article.slug}`}>
        {article.image_url ? (
          <div className="story__media">
            <div className="story__badges">
              <StoryBadges article={article} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upgradeImageUrl(article.image_url, "hero") ?? article.image_url}
              srcSet={imageSrcSet(article.image_url)}
              sizes={imageSrcSet(article.image_url) ? IMAGE_SIZES.hero : undefined}
              alt=""
            />
          </div>
        ) : (
          <div className="story__badges" style={{ marginBottom: 12 }}>
            <StoryBadges article={article} />
          </div>
        )}
        <div className="story__meta">
          <span className="story__source">{byline}</span>
          <span>•</span>
          <span>{timeAgo(article.published_at)}</span>
          <span className="story__viral">🔥 Viral Score {article.score}</span>
        </div>
        <h1 className="story__headline">{article.title}</h1>
        <PokokBerita
          points={article.summary_points}
          excerpt={article.excerpt}
          className="story__excerpt"
        />
      </Link>
    </article>
  );
}

function SideStory({ article }: { article: Article }) {
  const byline = article.author?.display_name ?? article.source_name ?? "Kontributor";
  return (
    <article className="story story--side">
      <Link href={`/artikel/${article.slug}`}>
        <div className="story__badges">
          <StoryBadges article={article} />
        </div>
        <h2 className="story__headline">{article.title}</h2>
        <div className="story__meta">
          <span>{byline}</span>
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

  // The hero (lead + side) is reserved for breaking RSS news - opinion
  // pieces have their own showcase (Daily Brief top slot, /opini, their
  // category badge) and shouldn't bump a photo breaking story out of
  // the homepage's main hero just for being the most recently published
  // row. They still appear further down in the regular grid.
  const heroEligible = articles.filter((a) => a.source_type !== "contributor");
  // Lead = newest story whose photo can be shown sharply (see lib/lead.ts);
  // the side stories stay the newest of the rest.
  const lead = pickLead(heroEligible);
  const restHero = heroEligible.filter((a) => a.id !== lead?.id);
  const side = restHero.slice(0, 3);
  const heroIds = new Set([lead?.id, ...side.map((a) => a.id)]);
  const gridArticles = articles.filter((a) => !heroIds.has(a.id));

  return (
    <main>
      <div className="container">
        <SponsorBanner />
      </div>

      {lead && (
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
      )}

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
