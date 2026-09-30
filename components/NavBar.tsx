"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/regions";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "📋 Daily Brief" },
  { href: "/kategori/news", label: "PinterNews" },
  { href: "/kategori/finance", label: "PinterFinance" },
  { href: "/kategori/hot", label: "PinterHot" },
  { href: "/kategori/inet", label: "PinterInet" },
  { href: "/kategori/sport", label: "PinterSport" },
  { href: "/kategori/oto", label: "PinterOto" },
  { href: "/kategori/travel", label: "PinterTravel" },
  { href: "/kategori/food", label: "PinterFood" },
  { href: "/kategori/health", label: "PinterHealth" },
  { href: "/kategori/wolipop", label: "PinterStyle" },
  { href: "/kategori/20detik", label: "PinterClip" },
];
const DAERAH_HREF = "/daerah";

// Which nav href (if any) corresponds to the current route - drives both
// the "is-active" text style and where the sliding yellow indicator
// moves to. "/daerah" and any "/daerah/<region>" both resolve to the
// "Daerah" nav item.
function matchNavHref(pathname: string): string | null {
  if (pathname === DAERAH_HREF || pathname.startsWith(`${DAERAH_HREF}/`)) return DAERAH_HREF;
  const hit = NAV.find((item) => pathname === item.href);
  return hit ? hit.href : null;
}

type IndicatorRect = { left: number; top: number; width: number; height: number };

export function NavBar() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  const activeHref = matchNavHref(pathname);

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
      // offsetLeft/offsetTop are relative to the nearest *positioned*
      // ancestor, which for the Daerah link is its own <li
      // class="nav-dropdown"> (position: relative, needed for the
      // dropdown menu) rather than the <ul> - that made offsetLeft come
      // back ~0 instead of the item's real position. getBoundingClientRect
      // sidesteps that entirely; adding back scrollLeft converts from
      // viewport-relative to the <ul>'s own scrollable content space,
      // which is what the absolutely-positioned indicator needs.
      const ulRect = ul.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - ulRect.left + ul.scrollLeft,
        top: elRect.top - ulRect.top,
        width: elRect.width,
        height: elRect.height,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref]);

  return (
    <nav className="masthead__nav">
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
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              data-href={item.href}
              className={`nav-link${item.href === activeHref ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="nav-dropdown">
          <Link
            href={DAERAH_HREF}
            data-href={DAERAH_HREF}
            className={`nav-link${activeHref === DAERAH_HREF ? " is-active" : ""}`}
          >
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
    </nav>
  );
}
