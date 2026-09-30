import { describe, it, expect } from "vitest";
import { upgradeImageUrl, imageSrcSet } from "./images";

describe("upgradeImageUrl - ANTARA", () => {
  it("raises a tiny 255x170 thumbnail to 800x533 for cards", () => {
    expect(
      upgradeImageUrl("https://cdn.antaranews.com/cache/255x170/2021/06/17/foto.jpg", "card")
    ).toBe("https://cdn.antaranews.com/cache/800x533/2021/06/17/foto.jpg");
  });

  it("raises to 1200x800 for hero images", () => {
    expect(
      upgradeImageUrl("https://cdn.antaranews.com/cache/255x170/2021/06/17/foto.jpg", "hero")
    ).toBe("https://cdn.antaranews.com/cache/1200x800/2021/06/17/foto.jpg");
  });

  it("works for the img.antaranews.com host too", () => {
    expect(
      upgradeImageUrl("https://img.antaranews.com/cache/800x533/2026/09/30/thumb/a.jpg", "hero")
    ).toBe("https://img.antaranews.com/cache/1200x800/2026/09/30/thumb/a.jpg");
  });

  it("never downgrades an image that is already large enough", () => {
    const u = "https://cdn.antaranews.com/cache/800x533/2026/09/30/marie.jpg";
    expect(upgradeImageUrl(u, "card")).toBe(u);
    const big = "https://cdn.antaranews.com/cache/1200x800/2026/09/30/marie.jpg";
    expect(upgradeImageUrl(big, "hero")).toBe(big);
  });

  it("leaves non-3:2 sizes alone (the CDN only serves known ratios)", () => {
    const u = "https://cdn.antaranews.com/cache/300x300/2026/09/30/square.jpg";
    expect(upgradeImageUrl(u, "card")).toBe(u);
  });
});

describe("upgradeImageUrl - detik", () => {
  it("raises w=360 to w=720 for cards", () => {
    expect(
      upgradeImageUrl("https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=360&q=90", "card")
    ).toBe("https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=720&q=90");
  });

  it("raises to w=1080 for hero images", () => {
    expect(
      upgradeImageUrl("https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=360&q=90", "hero")
    ).toBe("https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=1080&q=90");
  });

  it("repairs the stored '&amp;' so the quality parameter is actually read", () => {
    expect(
      upgradeImageUrl("https://akcdn.detik.net.id/visual/x_169.jpeg?w=360&amp;q=90", "card")
    ).toBe("https://akcdn.detik.net.id/visual/x_169.jpeg?w=720&q=90");
  });

  it("never downgrades", () => {
    const u = "https://akcdn.detik.net.id/visual/x_169.jpeg?w=1080&q=90";
    expect(upgradeImageUrl(u, "card")).toBe(u);
  });

  it("leaves a url without a width parameter alone", () => {
    const u = "https://akcdn.detik.net.id/visual/x_169.jpeg";
    expect(upgradeImageUrl(u, "card")).toBe(u);
  });
});

describe("upgradeImageUrl - everything else", () => {
  it("does not touch signed CDN urls (changing them breaks the signature)", () => {
    const tribun =
      "https://asset.tribunnews.com/abc=/148x99/filters:quality(30):format(webp)/tribunnews/foto/a.jpg";
    const kly =
      "https://cdn0-production-images-kly.akamaized.net/sig=/673x379/smart/filters:quality(75)/x.jpg";
    expect(upgradeImageUrl(tribun, "hero")).toBe(tribun);
    expect(upgradeImageUrl(kly, "hero")).toBe(kly);
  });

  it("still repairs a stray '&amp;' on hosts it otherwise leaves alone", () => {
    expect(upgradeImageUrl("https://example.com/a.jpg?x=1&amp;y=2", "card")).toBe(
      "https://example.com/a.jpg?x=1&y=2"
    );
  });

  it("passes null / empty / garbage through without throwing", () => {
    expect(upgradeImageUrl(null, "card")).toBeNull();
    expect(upgradeImageUrl(undefined, "card")).toBeNull();
    expect(upgradeImageUrl("", "card")).toBe("");
    expect(upgradeImageUrl("bukan url", "card")).toBe("bukan url");
  });
});

describe("imageSrcSet", () => {
  it("offers both ANTARA sizes the CDN actually serves (800w and 1200w)", () => {
    expect(
      imageSrcSet("https://cdn.antaranews.com/cache/255x170/2021/06/17/foto.jpg")
    ).toBe(
      "https://cdn.antaranews.com/cache/800x533/2021/06/17/foto.jpg 800w, " +
        "https://cdn.antaranews.com/cache/1200x800/2021/06/17/foto.jpg 1200w"
    );
  });

  it("works for img.antaranews.com and from an already-800 source url", () => {
    expect(
      imageSrcSet("https://img.antaranews.com/cache/800x533/2026/09/30/thumb/a.jpg")
    ).toBe(
      "https://img.antaranews.com/cache/800x533/2026/09/30/thumb/a.jpg 800w, " +
        "https://img.antaranews.com/cache/1200x800/2026/09/30/thumb/a.jpg 1200w"
    );
  });

  it("offers four detik widths and keeps the quality parameter", () => {
    expect(
      imageSrcSet("https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=360&amp;q=90")
    ).toBe(
      "https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=360&q=90 360w, " +
        "https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=720&q=90 720w, " +
        "https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=1080&q=90 1080w, " +
        "https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=1440&q=90 1440w"
    );
  });

  it("returns undefined where no larger variant exists (signed CDNs, odd ratios, no width)", () => {
    expect(
      imageSrcSet("https://asset.tribunnews.com/sig=/148x99/filters:quality(30)/a.jpg")
    ).toBeUndefined();
    expect(
      imageSrcSet("https://cdn0-production-images-kly.akamaized.net/sig=/673x379/smart/x.jpg")
    ).toBeUndefined();
    expect(
      imageSrcSet("https://cdn.antaranews.com/cache/300x300/2026/09/30/square.jpg")
    ).toBeUndefined();
    expect(imageSrcSet("https://akcdn.detik.net.id/visual/x_169.jpeg")).toBeUndefined();
  });

  it("returns undefined for null / empty input", () => {
    expect(imageSrcSet(null)).toBeUndefined();
    expect(imageSrcSet(undefined)).toBeUndefined();
    expect(imageSrcSet("")).toBeUndefined();
  });
});
