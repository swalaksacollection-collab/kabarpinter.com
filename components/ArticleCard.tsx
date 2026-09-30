import Link from "next/link";
import type { Article } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="story story--card">
      <Link href={`/artikel/${article.slug}`}>
        {article.image_url && (
          <div className="story__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image_url} alt="" loading="lazy" />
          </div>
        )}
        <div className="story__badges">
          {article.source_type === "contributor" && (
            <span className="story__badge story__badge--opini">✍️ Ulasan Pakar</span>
          )}
          {article.category_slug && (
            <span className={`story__badge story__badge--${article.category_slug}`}>
              {categoryLabel(article.category_slug)}
            </span>
          )}
        </div>
        <h3 className="story__headline">{article.title}</h3>
        <div className="story__meta">
          <span className="story__source">
            {article.author?.display_name ?? article.source_name ?? "Kontributor"}
          </span>
        </div>
      </Link>
    </article>
  );
}
