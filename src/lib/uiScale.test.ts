import { describe, expect, it } from "vitest";
import { getUiScaleFactor, UI_SCALE_OPTIONS } from "./uiScale";

describe("界面字体大小", () => {
  it("提供五档且中档保持当前默认大小", () => {
    expect(UI_SCALE_OPTIONS).toHaveLength(5);
    expect(getUiScaleFactor("medium")).toBe(1);
  });

  it("五档缩放值按从小到大排列", () => {
    expect(UI_SCALE_OPTIONS.map((option) => option.factor)).toEqual([0.8, 0.9, 1, 1.1, 1.2]);
  });
});
