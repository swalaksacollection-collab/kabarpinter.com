import { getPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 60;

export default async function DailyBriefPage() {
  const articles = await getPublishedArticles(50);
  const top5 = [...articles].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">Daily Brief</h1>
      <p className="mt-2 text-brand-charcoal/60">5 hal yang perlu Anda tahu hari ini</p>
      {top5.length === 0 ? (
        <p className="mt-6 text-brand-charcoal/60">Belum ada berita untuk brief hari ini.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {top5.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
