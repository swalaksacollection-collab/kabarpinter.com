import { describe, it, expect } from "vitest";
import {
  matchesTarget,
  isExcludedPath,
  sessionAllows,
  pickPopup,
  popupIsLive,
  safeHttpUrl,
  type PopupRow,
} from "./popup";

const mk = (over: Partial<PopupRow>): PopupRow => ({
  id: 1,
  title: "Promo",
  body: "",
  image_url: null,
  link_url: null,
  target_paths: "semua",
  max_per_session: 1,
  ...over,
});

describe("matchesTarget", () => {
  it("'semua' (any case/spacing) matches every path", () => {
    expect(matchesTarget("/artikel/x", "semua")).toBe(true);
    expect(matchesTarget("/", " Semua ")).toBe(true);
    expect(matchesTarget("/x", "")).toBe(true);
  });
  it("matches an exact path and its sub-paths on a segment boundary", () => {
    expect(matchesTarget("/opini", "/opini")).toBe(true);
    expect(matchesTarget("/opini/abc", "/opini")).toBe(true);
    expect(matchesTarget("/opini-lain", "/opini")).toBe(false);
  });
  it("supports comma lists with spaces and ignores a trailing slash", () => {
    expect(matchesTarget("/daerah/bali", "/opini, /daerah/")).toBe(true);
    expect(matchesTarget("/kategori/news", "/opini, /daerah")).toBe(false);
  });
  it("'/' targets the homepage only", () => {
    expect(matchesTarget("/", "/")).toBe(true);
    expect(matchesTarget("/opini", "/")).toBe(false);
  });
});

describe("isExcludedPath", () => {
  it("never shows popups in staff, contributor or auth areas", () => {
    for (const p of ["/redaksi/review", "/redaksi/popup", "/kontributor/dashboard", "/auth/confirm"]) {
      expect(isExcludedPath(p)).toBe(true);
    }
    expect(isExcludedPath("/")).toBe(false);
    expect(isExcludedPath("/artikel/redaksi-baru")).toBe(false);
  });
});

describe("sessionAllows", () => {
  it("allows while shown count is below the limit", () => {
    expect(sessionAllows(0, 1)).toBe(true);
    expect(sessionAllows(1, 1)).toBe(false);
    expect(sessionAllows(2, 3)).toBe(true);
  });
  it("treats junk limits as 1", () => {
    expect(sessionAllows(0, 0)).toBe(true);
    expect(sessionAllows(1, 0)).toBe(false);
    expect(sessionAllows(1, Number.NaN)).toBe(false);
  });
});

describe("pickPopup", () => {
  it("returns the first popup that matches the page and still has quota", () => {
    const list = [mk({ id: 3, target_paths: "/opini" }), mk({ id: 2 }), mk({ id: 1 })];
    expect(pickPopup(list, "/", () => 0)?.id).toBe(2);
    expect(pickPopup(list, "/opini", () => 0)?.id).toBe(3);
  });
  it("skips popups whose session quota is used up", () => {
    const list = [mk({ id: 2, max_per_session: 1 }), mk({ id: 1, max_per_session: 2 })];
    expect(pickPopup(list, "/", (id) => (id === 2 ? 1 : 0))?.id).toBe(1);
    expect(pickPopup(list, "/", () => 5)).toBeNull();
  });
  it("returns null on excluded paths or an empty list", () => {
    expect(pickPopup([mk({})], "/redaksi/review", () => 0)).toBeNull();
    expect(pickPopup([], "/", () => 0)).toBeNull();
  });
});

describe("popupIsLive", () => {
  const t = (iso: string) => new Date(iso).getTime();
  const base = { enabled: true, starts_at: null, ends_at: null };
  it("is live when enabled and inside the schedule (open ends allowed)", () => {
    expect(popupIsLive(base, t("2026-10-10T00:00:00Z"))).toBe(true);
    expect(
      popupIsLive(
        { enabled: true, starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-10-31T00:00:00Z" },
        t("2026-10-10T00:00:00Z")
      )
    ).toBe(true);
  });
  it("is not live when disabled, before the start or after the end", () => {
    const now = t("2026-10-10T00:00:00Z");
    expect(popupIsLive({ ...base, enabled: false }, now)).toBe(false);
    expect(popupIsLive({ ...base, starts_at: "2026-10-11T00:00:00Z" }, now)).toBe(false);
    expect(popupIsLive({ ...base, ends_at: "2026-10-09T00:00:00Z" }, now)).toBe(false);
  });
});

describe("safeHttpUrl", () => {
  it("accepts only http(s) urls", () => {
    expect(safeHttpUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeHttpUrl("  http://x.id ")).toBe("http://x.id/");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<b>")).toBeNull();
    expect(safeHttpUrl("//evil.com")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
