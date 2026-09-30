"use client";

// Light/dark switch in the masthead. The current theme lives on
// <html data-theme="..."> (set before first paint by the inline script in
// app/layout.tsx), so this button doesn't need React state: which icon
// shows is decided purely by CSS off that attribute, which keeps the
// server-rendered markup identical on every visit (no hydration mismatch,
// no icon flash).
import { THEME_STORAGE_KEY } from "@/lib/theme";

function nextTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
}

export function ThemeToggle() {
  function toggle() {
    const theme = nextTheme();
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage blocked (private mode etc.) - theme still applies for this page
    }
  }

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-label="Ganti tema terang/gelap"
      title="Ganti tema terang/gelap"
    >
      {/* moon: shown in light mode (click -> go dark) */}
      <svg className="theme-toggle__moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      {/* sun: shown in dark mode (click -> go light) */}
      <svg className="theme-toggle__sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  );
}
