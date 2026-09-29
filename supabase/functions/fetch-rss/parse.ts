export type FeedItem = {
  title: string;
  link: string;
  pubDate: string | null;
  imageUrl: string | null;
  excerpt: string | null;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return null;
  return decodeEntities(
    match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim()
  );
}

function extractExcerpt(block: string): string | null {
  const raw = extractTag(block, "description");
  if (!raw) return null;
  const plainText = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plainText) return null;
  return plainText.split(" ").slice(0, 30).join(" ");
}

export function parseFeedXml(xml: string): FeedItem[] {
  if (!xml.includes("<item")) return [];

  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const items: FeedItem[] = [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;

    const imageMatch = block.match(/<(?:media:content|enclosure)[^>]*url="([^"]+)"/i);

    items.push({
      title,
      link,
      pubDate: extractTag(block, "pubDate"),
      imageUrl: imageMatch ? imageMatch[1] : null,
      excerpt: extractExcerpt(block),
    });
  }

  return items;
}
