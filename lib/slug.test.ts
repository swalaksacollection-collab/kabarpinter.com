import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("converts a title to kebab-case", () => {
    expect(slugify("Gaji PPPK Daerah Ditanggung Pusat", new Set())).toBe(
      "gaji-pppk-daerah-ditanggung-pusat"
    );
  });

  it("strips punctuation", () => {
    expect(slugify("Untung Besar?! Ini Caranya.", new Set())).toBe("untung-besar-ini-caranya");
  });

  it("truncates to ~60 chars", () => {
    const long = "a".repeat(100);
    expect(slugify(long, new Set()).length).toBeLessThanOrEqual(60);
  });

  it("appends a random suffix on collision", () => {
    const existing = new Set(["gaji-pppk"]);
    const result = slugify("Gaji PPPK", existing);
    expect(result).not.toBe("gaji-pppk");
    expect(result.startsWith("gaji-pppk-")).toBe(true);
  });
});
