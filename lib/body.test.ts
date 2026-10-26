import { describe, expect, it } from "vitest";
import { isLocalImage, parseBody } from "./body";

describe("parseBody", () => {
  it("splits paragraphs, headings and allowed images", () => {
    const blocks = parseBody("Satu\n\n## Judul\n![Foto: Ist](/berita/a.jpg)\nDua", isLocalImage);
    expect(blocks).toEqual([
      { type: "p", text: "Satu" },
      { type: "h", text: "Judul" },
      { type: "img", src: "/berita/a.jpg", caption: "Foto: Ist" },
      { type: "p", text: "Dua" },
    ]);
  });
  it("drops images from disallowed sources", () => {
    expect(parseBody("![x](https://evil.example/a.jpg)", isLocalImage)).toEqual([]);
    expect(isLocalImage("//evil.example/a.jpg")).toBe(false);
    expect(isLocalImage("/berita/../a.jpg")).toBe(false);
  });
});
