import Link from "next/link";
import { getPublishedArticles } from "@/lib/articles";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "📋 Daily Brief", accent: true },
  { href: "/kategori/news", label: "detikNews" },
  { href: "/kategori/finance", label: "detikFinance" },
  { href: "/kategori/hot", label: "detikHot" },
  { href: "/kategori/inet", label: "detikInet" },
  { href: "/kategori/sport", label: "detikSport" },
  { href: "/kategori/oto", label: "detikOto" },
  { href: "/kategori/travel", label: "detikTravel" },
  { href: "/kategori/food", label: "detikFood" },
  { href: "/kategori/health", label: "detikHealth" },
  { href: "/kategori/wolipop", label: "Wolipop" },
  { href: "/kategori/20detik", label: "20detik" },
];

// Decorative only, matching detik.com's "Daerah" nav item — this project
// has no real per-region content or filtering behind it.
const DAERAH = ["Jabar", "Jateng", "Jatim", "Sumut", "Sulsel", "Bali"];

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
          <Link href="/kontributor/masuk" className="icon-btn" style={{ width: "auto", borderRadius: "999px", padding: "0 16px", fontSize: "13px", fontWeight: 600 }}>
            Daftar
          </Link>
          <Link href="/kontributor/masuk" className="btn-primary">
            Masuk
          </Link>
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
          <li className="nav-dropdown">
            <span className="nav-link" style={{ cursor: "default" }}>Daerah ▾</span>
            <div className="nav-dropdown__menu">
              {DAERAH.map((d) => (
                <Link key={d} href="/">{d}</Link>
              ))}
            </div>
          </li>
        </ul>
      </nav>
    </header>
  );
}
