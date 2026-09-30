import { describe, it, expect } from "vitest";
import { parseFeedXml } from "./parse";

describe("parseFeedXml", () => {
  it("parses well-formed RSS items", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>Berita Satu</title>
          <link>https://example.com/satu</link>
          <pubDate>Wed, 30 Sep 2026 10:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Berita Dua</title>
          <link>https://example.com/dua</link>
          <pubDate>Wed, 30 Sep 2026 09:00:00 GMT</pubDate>
        </item>
      </channel></rss>`;
    const items = parseFeedXml(xml);
    expect(items.length).toBe(2);
    expect(items[0].title).toBe("Berita Satu");
    expect(items[0].link).toBe("https://example.com/satu");
  });

  it("returns an empty array for malformed/non-XML content instead of throwing", () => {
    const notXml = "<html><body>502 Bad Gateway</body></html>";
    expect(parseFeedXml(notXml)).toEqual([]);
  });

  it("keeps two items with the same title but different links", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item><title>Sama</title><link>https://a.com/1</link></item>
        <item><title>Sama</title><link>https://b.com/2</link></item>
      </channel></rss>`;
    const items = parseFeedXml(xml);
    expect(items.length).toBe(2);
    expect(items[0].link).toBe("https://a.com/1");
    expect(items[1].link).toBe("https://b.com/2");
  });

  it("extracts a plain-text excerpt from an HTML description, truncated to ~70 words", () => {
    const words = Array.from({ length: 90 }, (_, i) => `kata${i}`).join(" ");
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>Judul</title>
          <link>https://example.com/a</link>
          <description><![CDATA[<img src="x.jpg"/>${words}]]></description>
        </item>
      </channel></rss>`;
    const items = parseFeedXml(xml);
    expect(items[0].excerpt).not.toBeNull();
    expect(items[0].excerpt).not.toContain("<img");
    expect(items[0].excerpt!.split(/\s+/).length).toBe(70);
    expect(items[0].excerpt!.startsWith("kata0")).toBe(true);
  });

  it("decodes HTML entities in the title and excerpt", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>Untung &amp; Rugi di Pasar Saham</title>
          <link>https://example.com/b</link>
          <description>Data &quot;terbaru&quot; hari ini</description>
        </item>
      </channel></rss>`;
    const items = parseFeedXml(xml);
    expect(items[0].title).toBe("Untung & Rugi di Pasar Saham");
    expect(items[0].excerpt).toBe('Data "terbaru" hari ini');
  });

  it("has no excerpt when there is no description tag", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item><title>Tanpa Deskripsi</title><link>https://example.com/c</link></item>
      </channel></rss>`;
    const items = parseFeedXml(xml);
    expect(items[0].excerpt).toBeNull();
  });
});
