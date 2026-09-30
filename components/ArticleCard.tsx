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
        {article.category_slug && (
          <span className={`story__badge story__badge--${article.category_slug}`}>
            {categoryLabel(article.category_slug)}
          </span>
        )}
        <h3 className="story__headline">{article.title}</h3>
        <div className="story__meta">
          <span className="story__source">{article.source_name ?? "Kontributor"}</span>
        </div>
      </Link>
    </article>
  );
}
