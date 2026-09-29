import { describe, it, expect } from "vitest";
import { filterArticles } from "./search";
import type { Article } from "./types";

const sample: Article[] = [
  { id: "1", title: "Gaji PPPK Naik 6.5%", excerpt: "Kenaikan gaji tahun depan" } as Article,
  { id: "2", title: "Resep Nasi Goreng", excerpt: "Masakan rumahan" } as Article,
];

describe("filterArticles", () => {
  it("matches on title, case-insensitive", () => {
    expect(filterArticles(sample, "gaji").map((a) => a.id)).toEqual(["1"]);
  });

  it("matches on excerpt too", () => {
    expect(filterArticles(sample, "masakan").map((a) => a.id)).toEqual(["2"]);
  });

  it("returns all articles for an empty/whitespace query", () => {
    expect(filterArticles(sample, "   ")).toHaveLength(2);
    expect(filterArticles(sample, "")).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterArticles(sample, "zzz-no-match")).toHaveLength(0);
  });
});
