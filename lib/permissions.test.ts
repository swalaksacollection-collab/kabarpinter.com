import { describe, expect, it } from "vitest";
import { cleanPermissions, hasPermission, validateNewPassword } from "./permissions";

describe("hasPermission", () => {
  it("admin can do everything, editors only what was granted", () => {
    expect(hasPermission("admin", [], "impor")).toBe(true);
    expect(hasPermission("editor", ["impor"], "impor")).toBe(true);
    expect(hasPermission("editor", ["impor"], "review")).toBe(false);
    expect(hasPermission("contributor", ["impor"], "impor")).toBe(false);
    expect(hasPermission(null, null, "impor")).toBe(false);
  });
});

describe("cleanPermissions", () => {
  it("keeps known keys once and drops the rest", () => {
    expect(cleanPermissions(["impor", "impor", "iklan", "review"])).toEqual(["impor", "review"]);
    expect(cleanPermissions("impor")).toEqual([]);
  });
});

describe("validateNewPassword", () => {
  it("rejects weak passwords", () => {
    expect(validateNewPassword("admin123")).not.toBeNull();
    expect(validateNewPassword("admin123admin123")).not.toBeNull();
    expect(validateNewPassword("aaaaaaaaaaaaaa")).not.toBeNull();
    expect(validateNewPassword("ndikpasowo-2026!", "ndikpasowo@gmail.com")).not.toBeNull();
  });
  it("accepts a long mixed password", () => {
    expect(validateNewPassword("Rimba-Kuning-84-Sore!", "x@y.com")).toBeNull();
  });
});
