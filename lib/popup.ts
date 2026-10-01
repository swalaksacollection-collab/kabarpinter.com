// Popup rules shared by the public <SitePopup /> and the admin form.
// Schedule (starts_at / ends_at) and enabled are enforced by the database
// (RLS on `popups`), so the client only ever receives live popups.

export type PopupRow = {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  target_paths: string;
  max_per_session: number;
};

// Areas where a popup must never appear.
const EXCLUDED = /^\/(redaksi|kontributor|auth)(\/|$)/;

export function isExcludedPath(pathname: string): boolean {
  return EXCLUDED.test(pathname);
}

function trimSlash(p: string): string {
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

// "semua" (or empty) = everywhere; otherwise a comma list of paths. A path
// matches itself and its sub-paths on a segment boundary; "/" = homepage only.
export function matchesTarget(pathname: string, targets: string): boolean {
  const list = targets
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0 || list.includes("semua")) return true;

  const path = trimSlash(pathname.toLowerCase());
  return list.some((raw) => {
    const t = trimSlash(raw.startsWith("/") ? raw : `/${raw}`);
    if (t === "/") return path === "/";
    return path === t || path.startsWith(`${t}/`);
  });
}

export function sessionAllows(shown: number, max: number): boolean {
  const limit = Number.isFinite(max) && max >= 1 ? Math.floor(max) : 1;
  return shown < limit;
}

// `popups` must already be ordered by priority (newest first).
export function pickPopup(
  popups: PopupRow[],
  pathname: string,
  shownCount: (id: number) => number
): PopupRow | null {
  if (isExcludedPath(pathname)) return null;
  return (
    popups.find(
      (p) => matchesTarget(pathname, p.target_paths) && sessionAllows(shownCount(p.id), p.max_per_session)
    ) ?? null
  );
}

// Mirrors the database rule (enabled AND inside the schedule) so the admin
// list can show whether a popup is on the air right now.
export type PopupSchedule = { enabled: boolean; starts_at: string | null; ends_at: string | null };

export function popupIsLive(p: PopupSchedule, nowMs: number): boolean {
  if (!p.enabled) return false;
  if (p.starts_at && new Date(p.starts_at).getTime() > nowMs) return false;
  if (p.ends_at && new Date(p.ends_at).getTime() < nowMs) return false;
  return true;
}

export function popupIsLiveNow(p: PopupSchedule): boolean {
  return popupIsLive(p, Date.now());
}

// Only http(s) links are ever rendered (blocks javascript:, data:, ...).
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
