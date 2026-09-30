import { describe, it, expect } from "vitest";
import { absoluteUrl, describeText, articleJsonLd, serializeJsonLd } from "./seo";
import type { Article } from "./types";

// Shape of the JSON-LD we assert on (avoids `any` in the tests).
type LD = {
  "@context": string;
  "@type": string;
  headline: string;
  datePublished: string;
  dateModified: string;
  image?: string[];
  author: unknown;
  publisher: { name: string };
  mainEntityOfPage: string;
  isBasedOn?: string;
};

const base = {
  id: "1",
  title: "Harga Emas Naik Tajam",
  slug: "harga-emas-naik-tajam-abc123",
  excerpt: "Harga emas hari ini naik.",
  external_url: "https://www.antaranews.com/berita/1",
  image_url: "https://cdn.antaranews.com/a.jpg",
  source_name: "ANTARA Ekonomi",
  source_type: "rss",
  published_at: "2026-09-30T05:00:00.000Z",
  updated_at: "2026-09-30T06:00:00.000Z",
  created_at: "2026-09-30T05:00:00.000Z",
  author: null,
} as unknown as Article;

describe("absoluteUrl", () => {
  it("prefixes site url to a path", () => {
    expect(absoluteUrl("/artikel/x")).toBe("https://kabarpinter.com/artikel/x");
  });
  it("adds a missing leading slash", () => {
    expect(absoluteUrl("artikel/x")).toBe("https://kabarpinter.com/artikel/x");
  });
  it("leaves absolute urls untouched", () => {
    expect(absoluteUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });
  it("maps '/' to the bare site url", () => {
    expect(absoluteUrl("/")).toBe("https://kabarpinter.com");
  });
});

describe("describeText", () => {
  it("strips html tags and collapses whitespace", () => {
    expect(describeText("<p>Halo   <b>dunia</b>\n\nlagi</p>")).toBe("Halo dunia lagi");
  });
  it("returns short text unchanged", () => {
    expect(describeText("Singkat saja.")).toBe("Singkat saja.");
  });
  it("truncates long text at a word boundary with an ellipsis", () => {
    const long = "kata ".repeat(100).trim();
    const out = describeText(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.slice(0, -1).endsWith(" ")).toBe(false);
    // must not cut a word in half
    expect(out.slice(0, -1).split(" ").every((w) => w === "kata")).toBe(true);
  });
  it("returns an empty string for null/undefined/blank", () => {
    expect(describeText(null)).toBe("");
    expect(describeText(undefined)).toBe("");
    expect(describeText("   ")).toBe("");
  });
});

describe("articleJsonLd", () => {
  it("builds a NewsArticle for an RSS article, crediting the source org", () => {
    const ld = articleJsonLd(base) as unknown as LD;
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.headline).toBe("Harga Emas Naik Tajam");
    expect(ld.datePublished).toBe("2026-09-30T05:00:00.000Z");
    expect(ld.dateModified).toBe("2026-09-30T06:00:00.000Z");
    expect(ld.image).toEqual(["https://cdn.antaranews.com/a.jpg"]);
    expect(ld.author).toEqual({ "@type": "Organization", name: "ANTARA Ekonomi" });
    expect(ld.publisher.name).toBe("Kabarpinter.com");
    expect(ld.mainEntityOfPage).toBe("https://kabarpinter.com/artikel/harga-emas-naik-tajam-abc123");
    expect(ld.isBasedOn).toBe("https://www.antaranews.com/berita/1");
  });

  it("credits a contributor as a Person and omits isBasedOn", () => {
    const ld = articleJsonLd({
      ...base,
      source_type: "contributor",
      external_url: null,
      author: { display_name: "dr. Andi Wijaya, Sp.PD", bio: null },
    }) as unknown as LD;
    expect(ld.author).toEqual({ "@type": "Person", name: "dr. Andi Wijaya, Sp.PD" });
    expect(ld.isBasedOn).toBeUndefined();
  });

  it("omits image when the article has none", () => {
    const ld = articleJsonLd({ ...base, image_url: null }) as unknown as LD;
    expect("image" in ld).toBe(false);
  });

  it("keeps headline within Google's 110 character limit", () => {
    const ld = articleJsonLd({ ...base, title: "x".repeat(200) }) as unknown as LD;
    expect(ld.headline.length).toBeLessThanOrEqual(110);
  });
});

describe("serializeJsonLd", () => {
  it("escapes '<' so a title cannot close the script tag", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });
});
