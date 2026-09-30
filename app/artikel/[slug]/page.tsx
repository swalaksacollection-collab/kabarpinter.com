import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getArticlesByCategory } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { categoryLabel } from "@/lib/categories";
import { fullDateTime } from "@/lib/date";
import { ShareButtons } from "@/components/ShareButtons";

export const revalidate = 60;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = article.category_slug
    ? (await getArticlesByCategory(article.category_slug))
        .filter((a) => a.id !== article.id)
        .slice(0, 4)
    : [];

  return (
    <main className="section">
      <div className="container">
        <article className="article">
          <nav className="article__breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            {article.source_type === "contributor" ? (
              <Link href="/opini">Ulasan Pakar</Link>
            ) : article.category_slug ? (
              <Link href={`/kategori/${article.category_slug}`}>
                {categoryLabel(article.category_slug)}
              </Link>
            ) : (
              <span>Umum</span>
            )}
          </nav>

          {article.source_type === "contributor" && (
            <span className="story__badge story__badge--opini" style={{ marginBottom: 12 }}>
              ✍️ Ulasan Pakar
            </span>
          )}

          <h1 className="article__headline">{article.title}</h1>

          <div className="article__meta">
            <span className="article__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {fullDateTime(article.published_at)}
            </span>
            <span className="story__source">
              {article.author?.display_name ?? article.source_name ?? "Kontributor"}
            </span>
          </div>

          {article.author?.bio && (
            <p className="article__author-bio">{article.author.bio}</p>
          )}

          <ShareButtons title={article.title} path={`/artikel/${article.slug}`} />

          {article.image_url && (
            <figure className="article__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.image_url} alt="" />
              {(article.source_name || article.author?.display_name) && (
                <figcaption>
                  Foto: {article.source_name ?? article.author?.display_name}
                </figcaption>
              )}
            </figure>
          )}

          {article.excerpt && <p className="article__lede">{article.excerpt}</p>}

          {article.body && (
            <div className="article__body">
              {article.body
                .split("\n")
                .filter((p) => p.trim().length > 0)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          )}

          {article.external_url && (
            <p className="article__source-note">
              Sumber:{" "}
              <a href={article.external_url} target="_blank" rel="noopener noreferrer">
                {article.source_name ?? "sumber asli"} →
              </a>
            </p>
          )}
        </article>

        {related.length > 0 && (
          <section className="article__related">
            <div className="section__head">
              <h2 className="section__title">
                <span className="section__rule" />
                Berita Terkait
              </h2>
            </div>
            <div className="story-grid">
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
