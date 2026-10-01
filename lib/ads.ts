// Google AdSense helpers. The admin enters a publisher id once and a numeric
// slot id per placement; the site renders the standard <ins class="adsbygoogle">
// itself. We deliberately do NOT store/inject arbitrary pasted HTML, so a
// mistyped or malicious value can never become script injection.

export const AD_SLOT_KEYS = ["header", "sidebar", "in_article", "footer"] as const;
export type AdSlotKey = (typeof AD_SLOT_KEYS)[number];

export type AdSettings = { publisher_id: string | null; enabled: boolean };
export type AdSlotRow = {
  slot_key: string;
  ad_slot_id: string | null;
  enabled: boolean;
};

const PUBLISHER_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{6,20}$/;

export function normalizePublisherId(input: string): string {
  const t = input.trim().toLowerCase();
  if (!t) return "";
  if (/^\d+$/.test(t)) return `ca-pub-${t}`;
  if (t.startsWith("pub-")) return `ca-${t}`;
  return t;
}

export function isValidPublisherId(id: string | null | undefined): boolean {
  return !!id && PUBLISHER_RE.test(id);
}

export function isValidSlotId(id: string | null | undefined): boolean {
  return !!id && SLOT_RE.test(id);
}

// Served at /ads.txt - required by AdSense to authorise the seller.
export function adsTxtContent(publisherId: string | null | undefined): string {
  if (!isValidPublisherId(publisherId)) {
    return "# Belum ada penerbit iklan yang dikonfigurasi.\n";
  }
  return `google.com, ${publisherId!.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
}

export function canRenderAd(
  settings: AdSettings | null | undefined,
  slot: AdSlotRow | null | undefined
): boolean {
  return (
    !!settings &&
    !!slot &&
    settings.enabled &&
    slot.enabled &&
    isValidPublisherId(settings.publisher_id) &&
    isValidSlotId(slot.ad_slot_id)
  );
}
