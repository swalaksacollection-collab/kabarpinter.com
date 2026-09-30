import { describe, it, expect } from "vitest";
import { validateApplication, fitWithin, safeNextPath, type ApplicationInput } from "./application";

const valid: ApplicationInput = {
  fullName: "Budi Santoso",
  displayName: "dr. Budi Santoso, Sp.PD",
  bio: "Dokter spesialis penyakit dalam, praktik di Bandung sejak 2015.",
  phone: "0812-3456-7890",
  city: "Bandung",
  profession: "Dokter",
  institution: "RS Contoh",
  socialUrl: "",
  hasSelfie: true,
};

describe("validateApplication", () => {
  it("accepts a complete application", () => {
    expect(validateApplication(valid)).toEqual({});
  });

  it("requires every mandatory field", () => {
    const errors = validateApplication({
      ...valid,
      fullName: "",
      displayName: "",
      bio: "",
      phone: "",
      city: "",
      profession: "",
      institution: "",
      hasSelfie: false,
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["bio", "city", "displayName", "fullName", "institution", "phone", "profession", "selfie"].sort()
    );
  });

  it("trims whitespace before measuring length", () => {
    expect(validateApplication({ ...valid, fullName: "  ab  " }).fullName).toBeDefined();
  });

  it("requires a bio of at least 30 characters", () => {
    expect(validateApplication({ ...valid, bio: "Terlalu pendek." }).bio).toBeDefined();
    expect(validateApplication({ ...valid, bio: "x".repeat(30) }).bio).toBeUndefined();
  });

  it("accepts common Indonesian phone formats", () => {
    for (const phone of ["081234567890", "0812-3456-7890", "+62 812 3456 7890", "(021) 5551234"]) {
      expect(validateApplication({ ...valid, phone }).phone).toBeUndefined();
    }
  });

  it("rejects phone numbers that are too short, too long or not numeric", () => {
    for (const phone of ["12345", "abcdefghij", "1".repeat(20)]) {
      expect(validateApplication({ ...valid, phone }).phone).toBeDefined();
    }
  });

  it("treats the social/portfolio link as optional but validates it when given", () => {
    expect(validateApplication({ ...valid, socialUrl: "" }).socialUrl).toBeUndefined();
    expect(validateApplication({ ...valid, socialUrl: "https://linkedin.com/in/budi" }).socialUrl).toBeUndefined();
    expect(validateApplication({ ...valid, socialUrl: "javascript:alert(1)" }).socialUrl).toBeDefined();
    expect(validateApplication({ ...valid, socialUrl: "bukan url" }).socialUrl).toBeDefined();
  });

  it("enforces the same maximum lengths as the database", () => {
    expect(validateApplication({ ...valid, fullName: "a".repeat(121) }).fullName).toBeDefined();
    expect(validateApplication({ ...valid, displayName: "a".repeat(81) }).displayName).toBeDefined();
    expect(validateApplication({ ...valid, bio: "a".repeat(601) }).bio).toBeDefined();
  });
});

describe("fitWithin", () => {
  it("leaves a small image untouched", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
  it("scales a landscape image so the longest side equals max", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
  });
  it("scales a portrait phone photo so the longest side equals max", () => {
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
  });
  it("never returns a zero dimension", () => {
    const r = fitWithin(10000, 1, 1000);
    expect(r.width).toBe(1000);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });
});

describe("safeNextPath", () => {
  it("allows normal in-site paths", () => {
    expect(safeNextPath("/kontributor/dashboard")).toBe("/kontributor/dashboard");
    expect(safeNextPath("/redaksi/pelamar?x=1")).toBe("/redaksi/pelamar?x=1");
  });
  it("falls back for missing values", () => {
    expect(safeNextPath(null)).toBe("/kontributor/dashboard");
    expect(safeNextPath("")).toBe("/kontributor/dashboard");
  });
  it("blocks open redirects to other sites", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com"]) {
      expect(safeNextPath(bad)).toBe("/kontributor/dashboard");
    }
  });
});
