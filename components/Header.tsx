import Link from "next/link";
import { getPublishedArticles } from "@/lib/articles";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "📋 Daily Brief", accent: true },
  { href: "/kategori/tren-viral", label: "Tren Viral" },
  { href: "/kategori/karir-skill", label: "Karir & Skill" },
  { href: "/kategori/peluang-bisnis", label: "Peluang Bisnis" },
  { href: "/kategori/umkm-inspirasi", label: "UMKM" },
  { href: "/kategori/ekonomi-uang", label: "Ekonomi" },
];

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

export async function Header() {
  const { day, full } = formatDate(new Date());
  const tickerArticles = await getPublishedArticles(8).catch(() => []);

  return (
    <header className="masthead">
      {tickerArticles.length > 0 && (
        <div className="ticker">
          <div className="ticker__label">
            <span className="ticker__pulse" />
            <span>BREAKING</span>
          </div>
          <div className="ticker__track">
            {tickerArticles.map((a, i) => (
              <span key={a.id}>
                <span className="ticker__item">{a.title}</span>
                {i < tickerArticles.length - 1 && <span className="ticker__sep">◆</span>}
              </span>
            ))}
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
          <button className="btn-primary">Berlangganan Gratis</button>
        </div>
      </div>

      <nav className="masthead__nav">
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`nav-link${item.accent ? " nav-link--accent" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
