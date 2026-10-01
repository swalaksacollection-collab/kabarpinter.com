// Image URLs we are willing to store/render. Only our own Supabase Storage
// buckets are accepted, so an admin form (or a tampered request) can never
// point the site at an arbitrary external image.

export const MEDIA_BUCKET = "site-media";
export const CONTRIBUTOR_BUCKET = "contributor-uploads";
export type MediaFolder = "avatars" | "popups" | "illustrations";

const MAX_URL = 500;

function prefix(supabaseUrl: string, bucket: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/`;
}

function insideBucket(url: string | null | undefined, supabaseUrl: string, bucket: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_URL) return false;
  if (/\s/.test(url) || url.includes("..")) return false;
  return url.startsWith(prefix(supabaseUrl, bucket));
}

export function isSiteMediaUrl(url: string | null | undefined, supabaseUrl: string): boolean {
  return insideBucket(url, supabaseUrl, MEDIA_BUCKET);
}

// site-media (admin-managed) or contributor-uploads (a contributor's own photo).
export function isOwnMediaUrl(url: string | null | undefined, supabaseUrl: string): boolean {
  return (
    insideBucket(url, supabaseUrl, MEDIA_BUCKET) ||
    insideBucket(url, supabaseUrl, CONTRIBUTOR_BUCKET)
  );
}

export function mediaObjectPath(folder: MediaFolder): string {
  return `${folder}/${crypto.randomUUID()}.jpg`;
}
