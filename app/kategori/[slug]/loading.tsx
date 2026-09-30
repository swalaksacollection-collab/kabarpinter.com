// Shown instantly while a category page is being fetched/rendered, so
// switching categories gives immediate feedback instead of a frozen screen.
export default function CategoryLoading() {
  return (
    <main className="section" aria-busy="true" aria-live="polite">
      <div className="container">
        <div className="section__head">
          <h1 className="section__title">
            <span className="section__rule" />
            <span className="skeleton skeleton--title" />
          </h1>
        </div>
        <div className="story-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="story story--card" key={i}>
              <div className="story__media skeleton" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line skeleton--short" />
            </div>
          ))}
        </div>
        <span className="sr-only">Memuat berita…</span>
      </div>
    </main>
  );
}
