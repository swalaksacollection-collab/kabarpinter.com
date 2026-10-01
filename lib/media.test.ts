import { describe, it, expect } from "vitest";
import { isSiteMediaUrl, isOwnMediaUrl, mediaObjectPath } from "./media";

const SB = "https://abc123.supabase.co";
const site = `${SB}/storage/v1/object/public/site-media/avatars/x.jpg`;
const contrib = `${SB}/storage/v1/object/public/contributor-uploads/user-1/1700000000.jpg`;

describe("isSiteMediaUrl", () => {
  it("accepts only objects inside our site-media bucket", () => {
    expect(isSiteMediaUrl(site, SB)).toBe(true);
    expect(isSiteMediaUrl(site, `${SB}/`)).toBe(true);
    expect(isSiteMediaUrl(contrib, SB)).toBe(false);
  });
  it("rejects other hosts, schemes, traversal and junk", () => {
    expect(isSiteMediaUrl("https://evil.com/storage/v1/object/public/site-media/a.jpg", SB)).toBe(false);
    expect(isSiteMediaUrl("javascript:alert(1)", SB)).toBe(false);
    expect(isSiteMediaUrl(`${SB}/storage/v1/object/public/site-media/../x.jpg`, SB)).toBe(false);
    expect(isSiteMediaUrl(`${site}${"a".repeat(600)}`, SB)).toBe(false);
    expect(isSiteMediaUrl("", SB)).toBe(false);
    expect(isSiteMediaUrl(null, SB)).toBe(false);
  });
});

describe("isOwnMediaUrl", () => {
  it("accepts site-media and contributor-uploads, nothing else", () => {
    expect(isOwnMediaUrl(site, SB)).toBe(true);
    expect(isOwnMediaUrl(contrib, SB)).toBe(true);
    expect(isOwnMediaUrl("https://img.example.com/a.jpg", SB)).toBe(false);
  });
});

describe("mediaObjectPath", () => {
  it("builds a random jpg path inside the requested folder", () => {
    const p = mediaObjectPath("avatars");
    expect(p).toMatch(/^avatars\/[0-9a-f-]{36}\.jpg$/);
    expect(mediaObjectPath("avatars")).not.toBe(p);
    expect(mediaObjectPath("popups")).toMatch(/^popups\//);
  });
});
