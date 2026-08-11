import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { DIMENSIONS } from "../types";

describe("catalog bundle", () => {
  it("uses stable unique ids and contains every required slot", () => {
    expect(new Set(catalog.items.map((item) => item.id)).size).toBe(catalog.items.length);
    for (const slot of ["armor", "primary", "secondary", "throwable", "stratagem", "booster"]) {
      expect(catalog.items.some((item) => item.slot === slot)).toBe(true);
    }
  });

  it("contains the release catalog baseline", () => {
    expect(catalog.items.filter((item) => item.slot === "primary")).toHaveLength(48);
    expect(catalog.items.filter((item) => item.slot === "secondary")).toHaveLength(21);
    expect(catalog.items.filter((item) => item.slot === "throwable")).toHaveLength(19);
    expect(catalog.items.filter((item) => item.slot === "booster")).toHaveLength(18);
    expect(catalog.items.length).toBeGreaterThan(200);
  });

  it("keeps contributions within the authored 0-25 range", () => {
    for (const item of catalog.items) {
      for (const dimension of DIMENSIONS) {
        expect(item.contributions[dimension]).toBeGreaterThanOrEqual(0);
        expect(item.contributions[dimension]).toBeLessThanOrEqual(25);
      }
    }
  });
});
