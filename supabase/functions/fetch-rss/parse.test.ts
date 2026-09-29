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
});
