import { describe, it, expect } from "vitest";
import {
  AD_SLOT_KEYS,
  normalizePublisherId,
  isValidPublisherId,
  isValidSlotId,
  adsTxtContent,
  canRenderAd,
} from "./ads";

describe("publisher id", () => {
  it("accepts ca-pub-<digits>", () => {
    expect(isValidPublisherId("ca-pub-1234567890123456")).toBe(true);
    expect(isValidPublisherId("ca-pub-12")).toBe(false);
    expect(isValidPublisherId("pub-1234567890123456")).toBe(false);
    expect(isValidPublisherId("ca-pub-123abc7890123456")).toBe(false);
    expect(isValidPublisherId('ca-pub-1234567890123456"><script>')).toBe(false);
    expect(isValidPublisherId("")).toBe(false);
  });
  it("normalizes whitespace, case and a missing 'ca-' prefix", () => {
    expect(normalizePublisherId("  CA-PUB-1234567890123456 ")).toBe("ca-pub-1234567890123456");
    expect(normalizePublisherId("pub-1234567890123456")).toBe("ca-pub-1234567890123456");
    expect(normalizePublisherId("1234567890123456")).toBe("ca-pub-1234567890123456");
    expect(normalizePublisherId("")).toBe("");
  });
});

describe("slot id", () => {
  it("accepts 6-20 digits only", () => {
    expect(isValidSlotId("1234567890")).toBe(true);
    expect(isValidSlotId("12345")).toBe(false);
    expect(isValidSlotId("12345678901234567890123")).toBe(false);
    expect(isValidSlotId("12345a7890")).toBe(false);
    expect(isValidSlotId("")).toBe(false);
  });
});

describe("adsTxtContent", () => {
  it("emits the Google line without the 'ca-' prefix", () => {
    expect(adsTxtContent("ca-pub-1234567890123456")).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n"
    );
  });
  it("emits only a comment when no valid publisher id is set", () => {
    expect(adsTxtContent(null)).toMatch(/^#/);
    expect(adsTxtContent("bukan-id")).toMatch(/^#/);
    expect(adsTxtContent("bukan-id")).not.toMatch(/google\.com/);
  });
});

describe("canRenderAd", () => {
  const settings = { publisher_id: "ca-pub-1234567890123456", enabled: true };
  const slot = { slot_key: "sidebar", ad_slot_id: "1234567890", enabled: true };
  it("renders only when settings, slot and both ids are valid and enabled", () => {
    expect(canRenderAd(settings, slot)).toBe(true);
    expect(canRenderAd({ ...settings, enabled: false }, slot)).toBe(false);
    expect(canRenderAd(settings, { ...slot, enabled: false })).toBe(false);
    expect(canRenderAd({ ...settings, publisher_id: null }, slot)).toBe(false);
    expect(canRenderAd(settings, { ...slot, ad_slot_id: null })).toBe(false);
    expect(canRenderAd(null, slot)).toBe(false);
    expect(canRenderAd(settings, null)).toBe(false);
  });
});

describe("AD_SLOT_KEYS", () => {
  it("lists the four placements", () => {
    expect([...AD_SLOT_KEYS]).toEqual(["header", "sidebar", "in_article", "footer"]);
  });
});
