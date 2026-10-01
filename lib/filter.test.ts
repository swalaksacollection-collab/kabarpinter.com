import { describe, it, expect } from "vitest";
import { evaluateSubmission, countWords, countLinks, type FilterRule } from "./filter";

const long = Array(40).fill("Pemerintah daerah meluncurkan program pelatihan UMKM untuk warga.").join(" ");
const base = { title: "Pelatihan UMKM digelar", excerpt: "Ringkasan singkat", body: long };

const rules: FilterRule[] = [
  { rule_type: "banned_word", value: "judi online", action: "reject", enabled: true },
  { rule_type: "banned_word", value: "pinjol ilegal", action: "flag", enabled: true },
  { rule_type: "min_words", value: "150", action: "flag", enabled: true },
  { rule_type: "max_links", value: "3", action: "flag", enabled: true },
];

describe("evaluateSubmission", () => {
  it("passes a clean, long article", () => {
    expect(evaluateSubmission(rules, base)).toEqual({ action: "ok", reasons: [] });
  });

  it("rejects banned words regardless of letter case", () => {
    const r = evaluateSubmission(rules, { ...base, body: long + " Daftar JUDI Online sekarang" });
    expect(r.action).toBe("reject");
    expect(r.reasons[0]).toContain("judi online");
  });

  it("checks the title and excerpt, not just the body", () => {
    expect(evaluateSubmission(rules, { ...base, title: "Awas Pinjol Ilegal" }).action).toBe("flag");
    expect(evaluateSubmission(rules, { ...base, excerpt: "judi online" }).action).toBe("reject");
  });

  it("matches whole words only (no false hits inside other words)", () => {
    const r: FilterRule[] = [{ rule_type: "banned_word", value: "ass", action: "reject", enabled: true }];
    expect(evaluateSubmission(r, { ...base, body: "kelas bisnis dan massal" }).action).toBe("ok");
    expect(evaluateSubmission(r, { ...base, body: "this is an ass move" }).action).toBe("reject");
  });

  it("treats rule values as plain text, not regex", () => {
    const r: FilterRule[] = [{ rule_type: "banned_word", value: "a+b(", action: "reject", enabled: true }];
    expect(() => evaluateSubmission(r, base)).not.toThrow();
    expect(evaluateSubmission(r, { ...base, body: "rumus a+b( salah" }).action).toBe("reject");
  });

  it("flags articles shorter than the minimum word count", () => {
    const r = evaluateSubmission(rules, { ...base, body: "Hanya sepuluh kata saja di sini ya teman teman semua" });
    expect(r.action).toBe("flag");
    expect(r.reasons.join(" ")).toMatch(/pendek/i);
  });

  it("counts a missing body as zero words", () => {
    expect(evaluateSubmission(rules, { ...base, body: null }).action).toBe("flag");
  });

  it("flags more links than the maximum", () => {
    const body = long + " http://a.com https://b.com http://c.com www.d.com";
    const r = evaluateSubmission(rules, { ...base, body });
    expect(r.action).toBe("flag");
    expect(r.reasons.join(" ")).toMatch(/tautan/i);
  });

  it("lets reject win over flag and lists every reason", () => {
    const r = evaluateSubmission(rules, { ...base, title: "Pinjol Ilegal", body: "judi online" });
    expect(r.action).toBe("reject");
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("ignores disabled rules", () => {
    const off = rules.map((x) => ({ ...x, enabled: false }));
    expect(evaluateSubmission(off, { ...base, body: "judi online" }).action).toBe("ok");
  });

  it("skips rules with a non-numeric threshold instead of crashing", () => {
    const bad: FilterRule[] = [{ rule_type: "min_words", value: "abc", action: "reject", enabled: true }];
    expect(evaluateSubmission(bad, { ...base, body: "x" }).action).toBe("ok");
  });

  it("ignores blank banned-word rules", () => {
    const blank: FilterRule[] = [{ rule_type: "banned_word", value: "  ", action: "reject", enabled: true }];
    expect(evaluateSubmission(blank, base).action).toBe("ok");
  });
});

describe("countWords / countLinks", () => {
  it("counts words across punctuation and newlines", () => {
    expect(countWords("Satu, dua.\n\nTiga-empat lima!")).toBe(4);
    expect(countWords("")).toBe(0);
  });
  it("counts http(s) and www links", () => {
    expect(countLinks("a http://x.com b https://y.id c www.z.co d")).toBe(3);
    expect(countLinks("tanpa tautan")).toBe(0);
  });
});
