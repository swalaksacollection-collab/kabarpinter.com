import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 60;

export default async function HomePage() {
  const articles = await getPublishedArticles(30);

  if (articles.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-brand-charcoal/60">
        <p>Belum ada berita yang lolos filter 😴</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">Beranda</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </main>
  );
}
