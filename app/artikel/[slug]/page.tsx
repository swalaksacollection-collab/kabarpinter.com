import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/articles";
import { categoryLabel } from "@/lib/categories";

export const revalidate = 60;

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "Baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="section">
      <div className="container">
        <article className="article">
          {article.category_slug && (
            <span className={`story__badge story__badge--${article.category_slug}`}>
              {categoryLabel(article.category_slug)}
            </span>
          )}
          <h1 className="article__headline">{article.title}</h1>
          <div className="article__meta">
            <span className="story__source">{article.source_name ?? "Kontributor"}</span>
            <span>•</span>
            <span>{timeAgo(article.published_at)}</span>
          </div>

          {article.image_url && (
            <div className="article__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.image_url} alt="" />
            </div>
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
            <a
              href={article.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="article__source-link"
            >
              Baca artikel lengkap di sumber asli →
            </a>
          )}
        </article>
      </div>
    </main>
  );
}
