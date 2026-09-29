import Link from "next/link";
import type { Article } from "@/lib/types";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="block rounded-lg border border-brand-charcoal/10 p-4 hover:border-brand-amber"
    >
      {article.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="mb-3 h-40 w-full rounded object-cover"
        />
      )}
      <p className="text-xs uppercase tracking-wide text-brand-amber">
        {article.category_slug ?? "Umum"}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-brand-charcoal">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="mt-2 text-sm text-brand-charcoal/70">{article.excerpt}</p>
      )}
      <p className="mt-3 text-xs text-brand-charcoal/50">
        {article.source_name ?? "Kontributor"}
      </p>
    </Link>
  );
}
