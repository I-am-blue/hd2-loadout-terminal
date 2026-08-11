import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { getStratagemGroup, STRATAGEM_GROUPS } from "./stratagemGroups";

describe("战备分组", () => {
  const stratagems = catalog.items.filter((item) => item.slot === "stratagem");

  it("全部战备都归入四个分组之一，且每组非空", () => {
    const counts = new Map(STRATAGEM_GROUPS.map((group) => [group.id, 0]));
    stratagems.forEach((item) => counts.set(getStratagemGroup(item), (counts.get(getStratagemGroup(item)) ?? 0) + 1));
    expect([...counts.values()].every((count) => count > 0)).toBe(true);
    expect([...counts.values()].reduce((sum, count) => sum + count, 0)).toBe(stratagems.length);
  });

  it("代表性装备进入正确颜色分组", () => {
    const groupOf = (name: string) => getStratagemGroup(stratagems.find((item) => item.nameEn === name)!);
    expect(groupOf("Orbital Precision Strike")).toBe("orbital");
    expect(groupOf("Eagle Airstrike")).toBe("eagle");
    expect(groupOf("Recoilless Rifle")).toBe("blue");
    expect(groupOf("Patriot Exosuit")).toBe("blue");
    expect(groupOf("Autocannon Sentry")).toBe("green");
  });
});
