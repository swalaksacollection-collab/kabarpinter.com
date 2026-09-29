import { getPublishedArticles } from "@/lib/articles";
import { filterArticles } from "@/lib/search";
import { ArticleCard } from "@/components/ArticleCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const all = await getPublishedArticles(100);
  const results = filterArticles(all, q);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-charcoal">Cari Berita</h1>
      <form className="mt-6" action="/cari">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari judul atau topik..."
          className="w-full max-w-md rounded border border-brand-charcoal/20 px-4 py-2"
        />
      </form>
      {results.length === 0 ? (
        <p className="mt-6 text-brand-charcoal/60">
          {q.trim() ? `Tidak ada hasil untuk "${q}".` : "Belum ada berita."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
