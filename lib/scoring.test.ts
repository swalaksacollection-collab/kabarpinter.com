import { describe, it, expect } from "vitest";
import { scoreArticle, matchTheme, THEME_KEYWORDS } from "./scoring";

describe("scoreArticle", () => {
  it("scores a fresh, viral-keyword, on-theme, imaged article highly", () => {
    const score = scoreArticle({
      title: "Viral! Bisnis Modal Kecil Bikin Untung Besar",
      publishedAt: new Date("2026-09-30T10:00:00Z"),
      now: new Date("2026-09-30T10:30:00Z"),
      hasImage: true,
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores a stale article with no keywords and no image low", () => {
    // Note: avoid words that accidentally *contain* a theme keyword as a
    // substring (e.g. "perusahaan" contains "usaha") — the ported matcher
    // is substring-based, faithfully mirroring the original algorithm.
    const score = scoreArticle({
      title: "Info Ringkas Mengenai Cuaca Hari Ini",
      publishedAt: new Date("2026-09-25T10:00:00Z"),
      now: new Date("2026-09-30T10:00:00Z"),
      hasImage: false,
    });
    expect(score).toBeLessThan(40);
  });

  it("gives zero recency points past the 48h window", () => {
    const score = scoreArticle({
      title: "Berita Biasa",
      publishedAt: new Date("2026-09-01T00:00:00Z"),
      now: new Date("2026-09-30T00:00:00Z"),
      hasImage: false,
    });
    // recency contributes 0, so total score must be well below a fresh equivalent
    const freshScore = scoreArticle({
      title: "Berita Biasa",
      publishedAt: new Date("2026-09-30T00:00:00Z"),
      now: new Date("2026-09-30T00:05:00Z"),
      hasImage: false,
    });
    expect(score).toBeLessThan(freshScore);
  });
});

describe("matchTheme", () => {
  it("matches 'finance' keywords", () => {
    expect(matchTheme("Rupiah Melemah, IHSG Ikut Anjlok Sore Ini")).toBe("finance");
  });

  it("matches 'sport' keywords", () => {
    expect(matchTheme("Timnas Menang di Liga, Suporter Rayakan Kemenangan")).toBe("sport");
  });

  it("matches 'food' keywords", () => {
    expect(matchTheme("Resep Kuliner Nusantara yang Wajib Dicoba")).toBe("food");
  });

  it("returns null when nothing matches", () => {
    expect(matchTheme("Info Ringkas Mengenai Cuaca Hari Ini")).toBeNull();
  });
});
