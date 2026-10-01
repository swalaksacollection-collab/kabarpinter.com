import { describe, it, expect } from "vitest";
import { rankByCoverage } from "./trending";
import type { Article } from "./types";

let n = 0;
function art(title: string, source: string, score = 50, at = "2026-10-01T05:00:00Z"): Article {
  n++;
  return {
    id: `id${n}`, source_type: "rss", status: "published", title, slug: `s${n}`,
    excerpt: null, body: null, external_url: null, image_url: null,
    category_slug: null, region_slug: null, score, source_name: source,
    contributor_id: null, editor_note: null, published_at: at,
    created_at: at, updated_at: at,
  };
}

describe("rankByCoverage", () => {
  it("puts the story covered by the most outlets first, even with lower score", () => {
    const result = rankByCoverage(
      [
        art("Tips cuan bikin untung besar dari usaha rumahan", "A", 95),
        art("Listyo Sigit digantikan Suyudi sebagai Kapolri baru", "A", 40),
        art("Presiden lantik Suyudi jadi Kapolri gantikan Listyo Sigit", "B", 45),
        art("Profil Suyudi, Kapolri baru pengganti Listyo Sigit", "C", 50),
      ],
      5,
    );
    expect(result[0].coverage).toBe(3);
    expect(result[0].article.title).toContain("Suyudi");
    expect(result).toHaveLength(2);
  });

  it("does not count the same outlet twice for coverage", () => {
    const result = rankByCoverage(
      [
        art("Nilai ekspor Indonesia Januari-Agustus 2026 capai 193,64 miliar dolar", "A"),
        art("Ekspor Indonesia Januari-Agustus 2026 capai 193,64 miliar dolar AS", "A"),
      ],
      5,
    );
    expect(result).toHaveLength(1);
    expect(result[0].coverage).toBe(1);
  });

  it("ignores contributor opinion pieces", () => {
    const o = art("Opini panjang soal kebijakan ekonomi nasional", "X");
    o.source_type = "contributor";
    expect(rankByCoverage([o], 5)).toHaveLength(0);
  });
});
