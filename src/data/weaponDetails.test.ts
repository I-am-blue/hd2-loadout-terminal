import { describe, expect, it } from "vitest";
import { getWeaponDetail } from "./weaponDetails";

describe("weapon details", () => {
  it("provides the verified AR-23 Liberator summary", () => {
    const detail = getWeaponDetail("primary-ar-23-liberator");
    expect(detail?.coreStats).toContainEqual({ label: "标准伤害", value: "90" });
    expect(detail?.coreStats).toContainEqual({ label: "射速", value: "640 RPM" });
    expect(detail?.sourceUrl).toBe("https://helldivers.wiki.gg/wiki/AR-23_Liberator");
  });

  it("does not invent details for unverified weapons", () => {
    expect(getWeaponDetail("primary-unknown")).toBeUndefined();
  });
});
