import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/articles";

export const revalidate = 60;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-brand-amber">
        {article.category_slug ?? "Umum"}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-brand-charcoal">{article.title}</h1>
      <p className="mt-2 text-sm text-brand-charcoal/50">
        {article.source_name ?? "Kontributor"}
      </p>
      {article.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="mt-6 w-full rounded-lg object-cover"
        />
      )}
      {article.excerpt && (
        <p className="mt-6 text-lg text-brand-charcoal/80">{article.excerpt}</p>
      )}
      {article.body && (
        <div className="prose mt-6 max-w-none text-brand-charcoal">{article.body}</div>
      )}
      {article.external_url && (
        <a
          href={article.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block text-brand-amber underline"
        >
          Baca sumber asli →
        </a>
      )}
    </main>
  );
}
