import type { CatalogItem } from "../types";

export type StratagemGroupId = "orbital" | "eagle" | "blue" | "green";

export const STRATAGEM_GROUPS: ReadonlyArray<{
  id: StratagemGroupId;
  label: string;
  description: string;
}> = [
  { id: "orbital", label: "轨道战备", description: "轨道攻击与支援" },
  { id: "eagle", label: "飞鹰战备", description: "飞鹰空袭与投弹" },
  { id: "blue", label: "蓝战备", description: "支援武器、背包、载具与机甲" },
  { id: "green", label: "绿战备", description: "炮台、地雷与防御阵地" },
];

export const getStratagemGroup = (item: CatalogItem): StratagemGroupId => {
  if (item.tags.includes("orbital")) return "orbital";
  if (item.tags.includes("eagle")) return "eagle";
  if (item.tags.some((tag) => ["sentry", "mine", "emplacement"].includes(tag))) return "green";
  return "blue";
};

export const getStratagemGroupMeta = (item: CatalogItem) => {
  const id = getStratagemGroup(item);
  return STRATAGEM_GROUPS.find((group) => group.id === id) ?? STRATAGEM_GROUPS[2];
};
