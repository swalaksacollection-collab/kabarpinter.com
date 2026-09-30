"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/regions";

type NavItem = { href: string; label: string };

// Always visible on desktop - the most-read sections. Kept short on
// purpose so the whole bar fits a 1366px laptop without horizontal
// scrolling (items past the right edge were effectively invisible).
const PRIMARY: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "📋 Daily Brief" },
  { href: "/kategori/news", label: "PinterNews" },
  { href: "/kategori/finance", label: "PinterFinance" },
  { href: "/kategori/hot", label: "PinterHot" },
  { href: "/kategori/sport", label: "PinterSport" },
];
// Tucked into the "Lainnya ▾" dropdown on desktop.
const MORE: NavItem[] = [
  { href: "/kategori/inet", label: "PinterInet" },
  { href: "/kategori/oto", label: "PinterOto" },
  { href: "/kategori/travel", label: "PinterTravel" },
  { href: "/kategori/food", label: "PinterFood" },
  { href: "/kategori/health", label: "PinterHealth" },
  { href: "/kategori/wolipop", label: "PinterStyle" },
  { href: "/kategori/20detik", label: "PinterClip" },
];
const DAERAH_HREF = "/daerah";
const MORE_KEY = "__more";

// Which nav slot corresponds to the current route - drives the
// "is-active" text style and where the sliding yellow indicator goes.
// "/daerah/*" -> Daerah; any MORE category -> the "Lainnya" trigger.
function matchNavHref(pathname: string): string | null {
  if (pathname === DAERAH_HREF || pathname.startsWith(`${DAERAH_HREF}/`)) return DAERAH_HREF;
  if (PRIMARY.some((i) => i.href === pathname)) return pathname;
  if (MORE.some((i) => i.href === pathname)) return MORE_KEY;
  return null;
}

type IndicatorRect = { left: number; top: number; width: number; height: number };

export function NavBar() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  // Remember which path the mobile panel was opened on, so it closes
  // automatically after navigating (no setState-in-effect needed).
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const mobileOpen = openOnPath === pathname;
  const activeHref = matchNavHref(pathname);
  const activeMoreLabel = MORE.find((i) => i.href === pathname)?.label;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOnPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    function measure() {
      const ul = listRef.current;
      // offsetParent is null while the desktop bar is display:none (mobile).
      if (!ul || !activeHref || ul.offsetParent === null) {
        setIndicator(null);
        return;
      }
      const el = ul.querySelector<HTMLElement>(`[data-href="${activeHref}"]`);
      if (!el) {
        setIndicator(null);
        return;
      }
      // getBoundingClientRect rather than offsetLeft: dropdown <li>s are
      // position: relative, which would make offsetLeft relative to them.
      const ulRect = ul.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - ulRect.left,
        top: elRect.top - ulRect.top,
        width: elRect.width,
        height: elRect.height,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    // Web fonts load after first paint and change link widths.
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref]);

  const linkClass = (key: string) => `nav-link${key === activeHref ? " is-active" : ""}`;
  const activeIf = (href: string) => (href === pathname ? "is-active" : undefined);

  return (
    <nav className="masthead__nav" aria-label="Menu utama">
      {/* ---------- desktop bar ---------- */}
      <ul ref={listRef} className="nav-desktop">
        {indicator && (
          <span
            className="nav-indicator"
            aria-hidden="true"
            style={{
              transform: `translate(${indicator.left}px, ${indicator.top}px)`,
              width: indicator.width,
              height: indicator.height,
            }}
          />
        )}
        {PRIMARY.map((item) => (
          <li key={item.href}>
            <Link href={item.href} data-href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          </li>
        ))}
        <li className="nav-dropdown">
          <Link href={DAERAH_HREF} data-href={DAERAH_HREF} className={linkClass(DAERAH_HREF)}>
            Daerah ▾
          </Link>
          <div className="nav-dropdown__menu">
            {REGIONS.map((r) => (
              <Link key={r.slug} href={`/daerah/${r.slug}`}>
                {r.label}
              </Link>
            ))}
          </div>
        </li>
        <li className="nav-dropdown">
          <button type="button" data-href={MORE_KEY} className={linkClass(MORE_KEY)} aria-haspopup="true">
            {activeMoreLabel ?? "Lainnya"} ▾
          </button>
          <div className="nav-dropdown__menu nav-dropdown__menu--right">
            {MORE.map((item) => (
              <Link key={item.href} href={item.href} aria-current={item.href === pathname ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </div>
        </li>
      </ul>

      {/* ---------- mobile bar + panel ---------- */}
      <div className="nav-mobile">
        <button
          type="button"
          className="nav-mobile__toggle"
          aria-expanded={mobileOpen}
          aria-controls="nav-mobile-panel"
          onClick={() => setOpenOnPath(mobileOpen ? null : pathname)}
        >
          <span aria-hidden="true">{mobileOpen ? "✕" : "☰"}</span> Menu
        </button>
        <div className="nav-mobile__quick">
          <Link href="/" className={activeIf("/")}>
            Beranda
          </Link>
          <Link href="/daily-brief" className={activeIf("/daily-brief")}>
            Daily Brief
          </Link>
        </div>
      </div>
      {mobileOpen && (
        <div id="nav-mobile-panel" className="nav-mobile__panel">
          <div className="nav-mobile__group">
            <p className="nav-mobile__heading">Kategori</p>
            <div className="nav-mobile__grid">
              {[...PRIMARY.slice(2), ...MORE].map((item) => (
                <Link key={item.href} href={item.href} className={activeIf(item.href)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="nav-mobile__group">
            <p className="nav-mobile__heading">Daerah</p>
            <div className="nav-mobile__grid">
              <Link href={DAERAH_HREF} className={activeIf(DAERAH_HREF)}>
                Semua Daerah
              </Link>
              {REGIONS.map((r) => (
                <Link key={r.slug} href={`/daerah/${r.slug}`} className={activeIf(`/daerah/${r.slug}`)}>
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
