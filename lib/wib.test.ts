import { describe, it, expect } from "vitest";
import { wibInputToIso, isoToWibInput } from "./wib";

describe("wibInputToIso", () => {
  it("reads a datetime-local value as Western Indonesia Time (UTC+7)", () => {
    expect(wibInputToIso("2026-10-10T08:00")).toBe("2026-10-10T01:00:00.000Z");
    expect(wibInputToIso("2026-01-01T00:30")).toBe("2025-12-31T17:30:00.000Z");
  });
  it("returns null for blank or invalid input", () => {
    expect(wibInputToIso("")).toBeNull();
    expect(wibInputToIso(null)).toBeNull();
    expect(wibInputToIso(undefined)).toBeNull();
    expect(wibInputToIso("besok pagi")).toBeNull();
    expect(wibInputToIso("2026-13-40T99:99")).toBeNull();
    expect(wibInputToIso("2026-10-10")).toBeNull();
  });
});

describe("isoToWibInput", () => {
  it("formats a stored timestamp back to a WIB datetime-local value", () => {
    expect(isoToWibInput("2026-10-10T01:00:00+00:00")).toBe("2026-10-10T08:00");
    expect(isoToWibInput("2025-12-31T17:30:00Z")).toBe("2026-01-01T00:30");
  });
  it("round-trips", () => {
    const v = "2026-03-05T14:45";
    expect(isoToWibInput(wibInputToIso(v))).toBe(v);
  });
  it("returns an empty string for missing or invalid timestamps", () => {
    expect(isoToWibInput(null)).toBe("");
    expect(isoToWibInput("")).toBe("");
    expect(isoToWibInput("nonsense")).toBe("");
  });
});
