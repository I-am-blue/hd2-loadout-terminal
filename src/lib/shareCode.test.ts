import { describe, expect, it } from "vitest";
import type { Loadout } from "../types";
import { decodeShareCode, encodeShareCode } from "./shareCode";

const loadout: Loadout = {
  schemaVersion: 1,
  id: "fixture",
  title: "自动机高难测试",
  createdAt: "2026-08-11T00:00:00Z",
  updatedAt: "2026-08-11T00:00:00Z",
  dataVersion: "2026.08.11-r1",
  context: { factionId: "automatons", difficulty: 8, missionId: "operations" },
  selection: {
    armorId: "armor-engineering-kit",
    primaryId: "primary-ar-23-liberator",
    secondaryId: "secondary-p-19-redeemer",
    throwableId: "throwable-g-23-stun",
    stratagemIds: ["stratagem-eagle-airstrike", "stratagem-orbital-railcannon-strike", "stratagem-machine-gun", "stratagem-supply-pack"],
    boosterId: "booster-stamina-enhancement",
  },
};

describe("share code", () => {
  it("round trips a complete loadout", () => {
    const decoded = decodeShareCode(encodeShareCode(loadout));
    expect(decoded.title).toBe(loadout.title);
    expect(decoded.selection).toEqual(loadout.selection);
    expect(decoded.context).toEqual(loadout.context);
  });

  it("rejects a corrupted checksum", () => {
    const code = encodeShareCode(loadout);
    expect(() => decodeShareCode(`${code.slice(0, -1)}0`)).toThrow();
  });
});
