import Link from "next/link";
import type { Article } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { upgradeImageUrl, imageSrcSet, IMAGE_SIZES } from "@/lib/images";

// `priority` = above-the-fold card: load its image eagerly. Everything else
// stays lazy. Explicit width/height (matches the 16:10 media box) reserves
// space so the grid doesn't jump while images arrive.
export function ArticleCard({
  article,
  priority = false,
}: {
  article: Article;
  priority?: boolean;
}) {
  return (
    <article className="story story--card">
      <Link href={`/artikel/${article.slug}`}>
        {article.image_url && (
          <div className="story__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upgradeImageUrl(article.image_url, "card") ?? article.image_url}
              srcSet={imageSrcSet(article.image_url)}
              sizes={imageSrcSet(article.image_url) ? IMAGE_SIZES.card : undefined}
              alt=""
              width={640}
              height={400}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
            />
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
