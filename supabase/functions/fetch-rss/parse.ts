export type FeedItem = {
  title: string;
  link: string;
  pubDate: string | null;
  imageUrl: string | null;
};

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return null;
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
    .trim();
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
    });
  }

  return items;
}
