"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { REGIONS } from "@/lib/regions";

type NavItem = { href: string; label: string };

// Row 1 (blue bar): cross-cutting destinations.
const MAIN: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "📋 Daily Brief" },
  { href: "/opini", label: "✍️ Opini" },
];
const DAERAH_HREF = "/daerah";

// Row 2 (light bar): every topical category, each underlined in its own
// accent colour (--c-<slug>, same as the category badges). Two rows keep
// all sections visible at once instead of hiding half behind a dropdown.
const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "news", label: "PinterNews" },
  { slug: "finance", label: "PinterFinance" },
  { slug: "hot", label: "PinterHot" },
  { slug: "inet", label: "PinterInet" },
  { slug: "sport", label: "PinterSport" },
  { slug: "oto", label: "PinterOto" },
  { slug: "travel", label: "PinterTravel" },
  { slug: "food", label: "PinterFood" },
  { slug: "health", label: "PinterHealth" },
  { slug: "wolipop", label: "PinterStyle" },
  { slug: "20detik", label: "PinterClip" },
];

// Which row-1 item (if any) corresponds to the current route - drives the
// sliding yellow indicator. "/daerah/*" resolves to Daerah.
function matchMainHref(pathname: string): string | null {
  if (pathname === DAERAH_HREF || pathname.startsWith(`${DAERAH_HREF}/`)) return DAERAH_HREF;
  return MAIN.some((i) => i.href === pathname) ? pathname : null;
}

type IndicatorRect = { left: number; top: number; width: number; height: number };

export function NavBar() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const catsRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  const activeHref = matchMainHref(pathname);

  // Yellow pill on row 1.
  useEffect(() => {
    function measure() {
      const ul = listRef.current;
      if (!ul || !activeHref) {
        setIndicator(null);
        return;
      }
      const el = ul.querySelector<HTMLElement>(`[data-href="${activeHref}"]`);
      if (!el) {
        setIndicator(null);
        return;
      }
      // getBoundingClientRect rather than offsetLeft: the Daerah <li> is
      // position: relative, which would make offsetLeft relative to it.
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

  // On phones row 2 scrolls sideways - make sure the active category is
  // actually in view rather than hidden past the right edge.
  useEffect(() => {
    const active = catsRef.current?.querySelector<HTMLElement>(".nav-cat.is-active");
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  const linkClass = (key: string) => `nav-link${key === activeHref ? " is-active" : ""}`;

  return (
    <nav className="masthead__nav" aria-label="Menu utama">
      <div className="nav-main">
        <ul ref={listRef}>
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
          {MAIN.map((item) => (
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
        </ul>
      </div>

      <div className="nav-cats">
        <ul ref={catsRef} aria-label="Kategori">
          {CATEGORIES.map((c) => {
            const href = `/kategori/${c.slug}`;
            const active = pathname === href;
            return (
              <li key={c.slug}>
                <Link
                  href={href}
                  className={`nav-cat${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  style={{ "--cat": `var(--c-${c.slug})` } as CSSProperties}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
