// "Pokok Berita" - 1-3 poin ringkas (disusun scripts/ringkas.py dari
// cuplikan RSS). Kalau belum ada poin, tampilkan cuplikan aslinya.
export function PokokBerita({
  points,
  excerpt,
  className = "",
  withLabel = false,
}: {
  points?: string[] | null;
  excerpt: string | null;
  className?: string;
  withLabel?: boolean;
}) {
  if (points && points.length > 0) {
    return (
      <div className={`pokok ${className}`}>
        {withLabel && <span className="pokok__label">Pokok Berita</span>}
        <ul className="pokok__list">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (!excerpt) return null;
  return <p className={className}>{excerpt}</p>;
}
