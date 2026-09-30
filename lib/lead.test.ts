import { describe, it, expect } from "vitest";
import { maxImageWidth } from "./images";
import { pickLead } from "./lead";
import type { Article } from "./types";

const ANTARA = "https://cdn.antaranews.com/cache/255x170/2026/09/30/a.jpg";
const DETIK = "https://akcdn.detik.net.id/visual/2026/09/30/x_169.jpeg?w=360&q=90";
const KLY = "https://cdn1-production-images-kly.akamaized.net/sig=/673x379/smart/filters:quality(75)/x.jpg";
const TRIBUN = "https://asset.tribunnews.com/sig=/148x99/filters:quality(30):format(webp)/tribunnews/foto/a.jpg";
const UPLOAD = "https://abc.supabase.co/storage/v1/object/public/contributor-uploads/u/1.jpg";

const art = (id: string, image_url: string | null): Article =>
  ({ id, image_url, source_type: "rss" }) as Article;

describe("maxImageWidth (best width obtainable for the photo)", () => {
  it("knows what the upgradable CDNs can deliver", () => {
    expect(maxImageWidth(ANTARA)).toBe(1200);
    expect(maxImageWidth("https://img.antaranews.com/cache/800x533/2026/a/thumb/b.jpg")).toBe(1200);
    expect(maxImageWidth(DETIK)).toBe(1440);
  });
  it("reads the fixed size of signed CDNs from the url", () => {
    expect(maxImageWidth(KLY)).toBe(673);
    expect(maxImageWidth(TRIBUN)).toBe(148);
  });
  it("trusts contributor uploads and treats unknown/empty as 0", () => {
    expect(maxImageWidth(UPLOAD)).toBe(1600);
    expect(maxImageWidth("https://example.com/whatever.jpg")).toBe(0);
    expect(maxImageWidth(null)).toBe(0);
    expect(maxImageWidth("")).toBe(0);
  });
});

describe("pickLead", () => {
  it("keeps the newest article when its photo is sharp enough", () => {
    const list = [art("1", ANTARA), art("2", DETIK), art("3", TRIBUN)];
    expect(pickLead(list)?.id).toBe("1");
  });

  it("skips a blurry newest article in favour of the first sharp one", () => {
    const list = [art("1", TRIBUN), art("2", KLY), art("3", DETIK), art("4", ANTARA)];
    expect(pickLead(list)?.id).toBe("3");
  });

  it("falls back to the sharpest available when none is high-res", () => {
    const list = [art("1", TRIBUN), art("2", KLY), art("3", TRIBUN)];
    expect(pickLead(list)?.id).toBe("2");
  });

  it("prefers an article with a photo over one without", () => {
    const list = [art("1", null), art("2", TRIBUN)];
    expect(pickLead(list)?.id).toBe("2");
  });

  it("only looks at the newest few (freshness stays the priority)", () => {
    const list = [art("1", TRIBUN), art("2", TRIBUN), art("3", TRIBUN), art("4", ANTARA)];
    expect(pickLead(list, 3)?.id).toBe("1"); // the sharp one is outside the window
    expect(pickLead(list, 4)?.id).toBe("4");
  });

  it("returns the first article when nothing has an image, and undefined for an empty list", () => {
    expect(pickLead([art("1", null), art("2", null)])?.id).toBe("1");
    expect(pickLead([])).toBeUndefined();
  });
});
