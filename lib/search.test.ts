import { describe, it, expect } from "vitest";
import { filterArticles, normalizeQueryParam } from "./search";
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

describe("normalizeQueryParam", () => {
  it("returns the string as-is for a single value", () => {
    expect(normalizeQueryParam("gaji")).toBe("gaji");
  });

  it("returns an empty string for undefined", () => {
    expect(normalizeQueryParam(undefined)).toBe("");
  });

  it("takes the first value when the param is duplicated (?q=a&q=b)", () => {
    expect(normalizeQueryParam(["a", "b"])).toBe("a");
  });

  it("returns an empty string for an empty array", () => {
    expect(normalizeQueryParam([])).toBe("");
  });
});
