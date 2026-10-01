"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { isExcludedPath, pickPopup, safeHttpUrl, type PopupRow } from "@/lib/popup";

// Admin-managed promo popup (/redaksi/popup). Rules: always a visible close
// button, Esc / backdrop click also close, capped per browser session, never
// on staff/contributor/auth pages, and it yields to the app-install prompt.
// Fetched client-side so public pages stay static/ISR.

const key = (id: number) => `kp_popup_${id}`;
function shownCount(id: number): number {
  try {
    return Number(sessionStorage.getItem(key(id)) || 0) || 0;
  } catch {
    return 0;
  }
}
function bump(id: number) {
  try {
    sessionStorage.setItem(key(id), String(shownCount(id) + 1));
  } catch {}
}

let cached: Promise<PopupRow[]> | null = null;
function loadPopups(): Promise<PopupRow[]> {
  cached ??= (async () => {
    try {
      const { data, error } = await createPublicClient()
        .from("popups")
        .select("id, title, body, image_url, link_url, target_paths, max_per_session")
        .order("id", { ascending: false });
      return error ? [] : ((data as PopupRow[] | null) ?? []);
    } catch {
      return [];
    }
  })();
  return cached;
}

function track(id: number, event: "view" | "click") {
  try {
    void createPublicClient()
      .rpc("track_popup", { p_id: id, p_event: event })
      .then(
        () => {},
        () => {}
      );
  } catch {}
}

export function SitePopup() {
  const pathname = usePathname();
  // Remember which path the popup was opened for; it is hidden as soon as the
  // visitor navigates elsewhere (derived below, no extra setState needed).
  const [open, setOpen] = useState<{ path: string; popup: PopupRow } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isExcludedPath(pathname)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    loadPopups().then((list) => {
      if (cancelled) return;
      const popup = pickPopup(list, pathname, shownCount);
      if (!popup) return;

      const show = (mayWait: boolean) => {
        if (cancelled) return;
        // Don't stack on top of the "install the app" prompt.
        if (mayWait && document.querySelector('[aria-label="Install aplikasi Kabarpinter"]')) {
          timer = setTimeout(() => show(false), 8000);
          return;
        }
        bump(popup.id);
        track(popup.id, "view");
        setOpen({ path: pathname, popup });
      };
      timer = setTimeout(() => show(true), 3000);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  const visible = open && open.path === pathname ? open.popup : null;

  useEffect(() => {
    if (!visible) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;
  const link = safeHttpUrl(visible.link_url);

  return (
    <div
      className="site-popup__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(null);
      }}
    >
      <div
        className="site-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-popup-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="site-popup__close"
          aria-label="Tutup"
          onClick={() => setOpen(null)}
        >
          ✕
        </button>
        {visible.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="site-popup__image" src={visible.image_url} alt="" />
        )}
        <div className="site-popup__body">
          <h2 id="site-popup-title" className="site-popup__title">
            {visible.title}
          </h2>
          {visible.body && <p className="site-popup__text">{visible.body}</p>}
          {link && (
            <a
              className="btn-primary site-popup__cta"
              href={link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => {
                track(visible.id, "click");
                setOpen(null);
              }}
            >
              Selengkapnya
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
