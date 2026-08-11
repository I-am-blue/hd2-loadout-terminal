import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import type { LoadoutSelection } from "../types";
import { evaluateLoadout, isCompleteSelection } from "./scoring";

const selection: LoadoutSelection = {
  armorId: "armor-engineering-kit",
  primaryId: "primary-ar-23-liberator",
  secondaryId: "secondary-p-19-redeemer",
  throwableId: "throwable-g-23-stun",
  stratagemIds: [
    "stratagem-eagle-airstrike",
    "stratagem-orbital-railcannon-strike",
    "stratagem-machine-gun",
    "stratagem-supply-pack",
  ],
  boosterId: "booster-stamina-enhancement",
};

describe("scoring engine", () => {
  it("requires every combat slot and four unique stratagems", () => {
    expect(isCompleteSelection(selection)).toBe(true);
    expect(isCompleteSelection({ ...selection, stratagemIds: selection.stratagemIds.slice(0, 3) })).toBe(false);
    expect(isCompleteSelection({ ...selection, stratagemIds: Array(4).fill(selection.stratagemIds[0]) })).toBe(false);
  });

  it("is deterministic and keeps every dimension bounded", () => {
    const context = { factionId: "automatons" as const, difficulty: 8, missionId: "operations" };
    const first = evaluateLoadout(selection, context, catalog);
    const second = evaluateLoadout(selection, context, catalog);
    expect(first.finalScore).toBe(second.finalScore);
    expect(Object.values(first.dimensions).every((score) => score >= 0 && score <= 100)).toBe(true);
    expect(first.complete).toBe(true);
  });

  it("does not produce a final score for partial loadouts", () => {
    const result = evaluateLoadout(
      { stratagemIds: [] },
      { factionId: "terminids", difficulty: 3, missionId: "eradicate" },
      catalog,
    );
    expect(result.complete).toBe(false);
    expect(result.finalScore).toBeNull();
  });

  it("applies a high-difficulty critical coverage cap", () => {
    const weak = {
      armorId: "armor-scout",
      primaryId: "primary-ar-23-liberator",
      secondaryId: "secondary-p-2-peacemaker",
      throwableId: "throwable-g-3-smoke",
      stratagemIds: [
        "stratagem-machine-gun",
        "stratagem-stalwart",
        "stratagem-jump-pack",
        "stratagem-shield-generator-pack",
      ],
      boosterId: "booster-uav-recon-booster",
    } satisfies LoadoutSelection;
    const result = evaluateLoadout(weak, { factionId: "automatons", difficulty: 10, missionId: "boss" }, catalog);
    expect(result.scoreCap).not.toBeNull();
    expect(result.finalScore!).toBeLessThanOrEqual(result.scoreCap!);
  });
});
