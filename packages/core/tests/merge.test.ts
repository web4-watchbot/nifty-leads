import { describe, it, expect } from "vitest";
import {
  jaroWinkler,
  haversineMeters,
  leadsMatch,
  computeMatchName,
} from "../src/merge";

describe("jaroWinkler", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinkler("dentist", "dentist")).toBe(1);
  });
  it("returns 0 for empty", () => {
    expect(jaroWinkler("", "dentist")).toBe(0);
  });
  it("is high for similar strings", () => {
    expect(jaroWinkler("dentist", "dentists")).toBeGreaterThan(0.9);
  });
});

describe("haversineMeters", () => {
  it("returns 0 for same point", () => {
    expect(haversineMeters(19, 73, 19, 73)).toBe(0);
  });
  it("returns positive distance", () => {
    const d = haversineMeters(19, 73, 20, 74);
    expect(d).toBeGreaterThan(100000); // ~150km
  });
});

describe("leadsMatch", () => {
  const base: Parameters<typeof leadsMatch>[0] = {
    companyDomain: "acme.com",
    phoneE164: "+14155550123",
    googlePlaceId: "ChIJx",
    osmId: "123",
    matchName: "acme dental",
    postalCode: "411001",
    latitude: 19,
    longitude: 73,
  };

  const idOnly = (overrides: Partial<Parameters<typeof leadsMatch>[0]> = {}) => ({
    companyDomain: "acme.com",
    phoneE164: "+14155550123",
    googlePlaceId: "ChIJx",
    osmId: "123",
    matchName: "acme dental",
    postalCode: "411001",
    latitude: 19,
    longitude: 73,
    ...overrides,
  });

  it("matches on company_domain", () => {
    const a = idOnly();
    const b = idOnly({ companyDomain: "acme.com" });
    expect(leadsMatch(a, b)).toBe(true);
    const c = idOnly({
      companyDomain: "other.com",
      phoneE164: undefined,
      googlePlaceId: undefined,
      osmId: undefined,
      matchName: undefined,
      postalCode: undefined,
    });
    expect(leadsMatch(a, c)).toBe(false);
  });

  it("matches on phone", () => {
    expect(leadsMatch(base, { ...base, phoneE164: "+14155550123" })).toBe(true);
  });

  it("matches on google_place_id", () => {
    expect(leadsMatch(base, { ...base, googlePlaceId: "ChIJx" })).toBe(true);
  });

  it("matches on osm_id", () => {
    expect(leadsMatch(base, { ...base, osmId: "123" })).toBe(true);
  });

  it("matches on match_name + postal_code", () => {
    expect(
      leadsMatch(base, { ...base, matchName: "acme dental", postalCode: "411001" })
    ).toBe(true);
  });

  const nameOnly = {
    matchName: "acme dental",
    latitude: 19,
    longitude: 73,
  } as Parameters<typeof leadsMatch>[0];

  it("matches similar names close together (<200m)", () => {
    expect(
      leadsMatch(
        nameOnly,
        { ...nameOnly, matchName: "acme dental clinic", latitude: 19.001, longitude: 73.001 }
      )
    ).toBe(true);
  });

  it("does not match far apart similar names", () => {
    expect(
      leadsMatch(
        nameOnly,
        { ...nameOnly, matchName: "acme dental clinic", latitude: 20, longitude: 74 }
      )
    ).toBe(false);
  });
});

describe("computeMatchName", () => {
  it("removes legal suffixes", () => {
    expect(computeMatchName("ABC Dental Pvt Ltd")).toBe("abc dental");
  });
});
