import { describe, expect, it } from "vitest";
import {
  buildBody,
  extractUrls,
  isPrivateIp,
  isPublicHttpUrl,
  isUnreadableHost,
  normalizeDraft,
  parseArticleHtml,
} from "./importer";

describe("extractUrls", () => {
  it("finds links in pasted WhatsApp text, trims punctuation, dedupes", () => {
    const text = `Usai Produksi 50 Film https://putraindonews.com/berita/a-b.\nhttps://putraindonews.com/berita/a-b\n(https://vt.tiktok.com/ZSg/)`;
    expect(extractUrls(text)).toEqual(["https://putraindonews.com/berita/a-b", "https://vt.tiktok.com/ZSg/"]);
  });
  it("returns nothing when there is no link", () => {
    expect(extractUrls("halo semua")).toEqual([]);
  });
});

describe("fetch safety", () => {
  it("rejects private and loopback addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.1.1", "169.254.169.254", "::1", "fd00::1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
  it("accepts only public http(s) hostnames", () => {
    expect(isPublicHttpUrl("https://www.pakuanpos.com/2026/10/x.html")).toBe(true);
    for (const u of ["http://localhost/a", "http://127.0.0.1/a", "ftp://a.com/x", "https://a.internal/x", "https://user:p@a.com/x", "https://intranet/x"]) {
      expect(isPublicHttpUrl(u)).toBe(false);
    }
  });
  it("flags hosts that cannot be read", () => {
    expect(isUnreadableHost("https://vt.tiktok.com/ZSgDeAExv/")).toBe(true);
    expect(isUnreadableHost("https://putraindonews.com/berita/x")).toBe(false);
  });
});

describe("parseArticleHtml", () => {
  const html = `<html><head><title>Fallback</title>
    <meta property="og:title" content="Judul &amp; Berita">
    <meta content="https://x.com/up/hero.jpg" property="og:image">
    <meta property="og:site_name" content="Putraindo News"></head>
    <body><header><img src="/logo.png"></header>
    <p>Ini paragraf pertama yang cukup panjang untuk dianggap isi berita, lebih dari lima puluh karakter.</p>
    <p>Baca juga: berita lain yang tidak relevan dan cukup panjang untuk lolos batas karakter minimal.</p>
    <img src="/up/foto2.jpg" alt="Foto dua"><img src="/img/icon.png">
    <script>var p="<p>jangan ambil ini ya, ini skrip dan bukan isi berita sama sekali</p>"</script></body></html>`;
  const page = parseArticleHtml(html, "https://x.com/berita/a");
  it("reads title, site and text, skipping noise", () => {
    expect(page.title).toBe("Judul & Berita");
    expect(page.siteName).toBe("Putraindo News");
    expect(page.text).toContain("paragraf pertama");
    expect(page.text).not.toContain("Baca juga");
    expect(page.text).not.toContain("skrip");
  });
  it("collects photos, og:image first, without logos/icons", () => {
    expect(page.images.map((i) => i.url)).toEqual(["https://x.com/up/hero.jpg", "https://x.com/up/foto2.jpg"]);
  });
});

describe("normalizeDraft + buildBody", () => {
  const cats = ["news", "hot"];
  const raw = {
    title: "  Judul\nBaru ",
    excerpt: "Ringkas",
    category_slug: "bukan-kategori",
    hero_photo: 0,
    blocks: [
      { type: "p", text: "Paragraf satu" },
      { type: "photo", photo: 0, caption: "hero (dobel)" },
      { type: "h", text: "## Subjudul" },
      { type: "photo", photo: 1, caption: "Foto: Ist" },
      { type: "photo", photo: 9, caption: "tidak ada" },
      { type: "p", text: "Paragraf dua" },
    ],
  };
  it("coerces unknown categories and drops invalid photo refs", () => {
    const d = normalizeDraft(raw, cats, 2);
    expect(d.title).toBe("Judul Baru");
    expect(d.category).toBe("news");
    expect(d.blocks.filter((b) => b.type === "photo")).toHaveLength(2);
  });
  it("builds body markup without repeating the hero photo", () => {
    const d = normalizeDraft(raw, cats, 2);
    expect(buildBody(d, ["/a.jpg", "/b.jpg"])).toBe(
      "Paragraf satu\n## Subjudul\n![Foto: Ist](/b.jpg)\nParagraf dua"
    );
  });
  it("rejects an answer with no paragraphs", () => {
    expect(() => normalizeDraft({ title: "x", blocks: [] }, cats, 0)).toThrow();
  });
});
