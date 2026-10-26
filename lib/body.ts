// Parses an article body into blocks. Plain lines are paragraphs. Two optional
// markers let editors lay out a story:
//   ## Subjudul                 -> heading
//   ![Keterangan foto](/berita/x.jpg)  -> figure with caption
// Images are only accepted from our own origin (/...) or https hosts listed
// by the caller, so a body can never pull in arbitrary external pictures.

export type BodyBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "img"; src: string; caption: string };

const IMG_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

export function parseBody(body: string, isAllowedSrc: (src: string) => boolean): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const img = IMG_RE.exec(line);
    if (img) {
      if (isAllowedSrc(img[2])) blocks.push({ type: "img", src: img[2], caption: img[1].trim() });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h", text: line.slice(3).trim() });
      continue;
    }
    blocks.push({ type: "p", text: line });
  }
  return blocks;
}

// Own-site static photos (/berita/...) only; no protocol-relative URLs.
export function isLocalImage(src: string): boolean {
  return /^\/[A-Za-z0-9/_.-]+\.(jpe?g|png|webp)$/i.test(src) && !src.includes("..") && !src.startsWith("//");
}
