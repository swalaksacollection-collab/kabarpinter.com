import Link from "next/link";
import { getTopArticles } from "@/lib/articles";
import { NavBar } from "@/components/NavBar";
import type { Article } from "@/lib/types";

const DAYS = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const MONTHS = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];

function formatDate(d: Date) {
  return {
    day: DAYS[d.getDay()],
    full: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
  };
}

function tickerSpans(articles: Article[], keyPrefix: string) {
  return articles.map((a) => (
    <span key={`${keyPrefix}-${a.id}`}>
      <span className="ticker__item">{a.title}</span>
      <span className="ticker__sep">◆</span>
    </span>
  ));
}

export async function Header() {
  const { day, full } = formatDate(new Date());
  // "Today's most important stories" for the breaking-news ticker: ranked
  // by viral score (not just latest), within the last 48h.
  const tickerArticles = await getTopArticles(8).catch(() => []);

  return (
    <header className="masthead">
      {tickerArticles.length > 0 && (
        <div className="ticker">
          <div className="ticker__label">
            <span className="ticker__pulse" />
            <span>BREAKING</span>
          </div>
          <div className="ticker__track">
            {/* Content is duplicated so the marquee loops seamlessly: as
                the first copy scrolls fully off-screen to the left, the
                second copy arrives right behind it with no visible gap
                or jump-cut. */}
            <div className="ticker__marquee">
              {tickerSpans(tickerArticles, "a")}
              {tickerSpans(tickerArticles, "b")}
            </div>
          </div>
        </div>
      )}

      <div className="masthead__top">
        <div className="masthead__date">
          <span className="masthead__day">{day}</span>
          <span>{full}</span>
        </div>
        <div className="masthead__brand">
          <Link href="/" className="logo">
            Kabar<span className="logo__accent">Pinter.com</span>
          </Link>
          <p className="masthead__tagline">Tren · Peluang · Karir · UMKM</p>
        </div>
        <div className="masthead__actions">
          <Link href="/cari" className="icon-btn" aria-label="Cari">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <Link href="/kontributor/masuk" className="btn-outline">
            Daftar
          </Link>
          <Link href="/kontributor/masuk" className="btn-primary">
            Masuk
          </Link>
        </div>
      </div>

      <NavBar />
    </header>
  );
}
