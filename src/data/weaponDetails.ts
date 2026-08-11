export interface WeaponStat {
  label: string;
  value: string;
}

export interface WeaponDetail {
  itemId: string;
  weaponType: string;
  penetration: string;
  firingModes: string[];
  coreStats: WeaponStat[];
  secondaryStats: WeaponStat[];
  procurement: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceRevision: string;
}

/**
 * 人工核验的武器事实数据。此表随数据包发布，不在应用运行时访问 Wiki。
 * 未出现在表内的武器会在详情面板中显示“资料待核验”。
 */
export const weaponDetails: Record<string, WeaponDetail> = {
  "primary-ar-23-liberator": {
    itemId: "primary-ar-23-liberator",
    weaponType: "突击步枪",
    penetration: "轻型",
    firingModes: ["全自动", "半自动", "三连发"],
    coreStats: [
      { label: "标准伤害", value: "90" },
      { label: "射速", value: "640 RPM" },
      { label: "弹匣容量", value: "45" },
      { label: "备用弹匣", value: "8" },
      { label: "人体工学", value: "65" },
      { label: "后坐力", value: "14" },
    ],
    secondaryStats: [
      { label: "耐久伤害", value: "22" },
      { label: "护甲穿透", value: "轻型" },
      { label: "射击模式", value: "自动 / 半自动 / 三连发" },
    ],
    procurement: "完成新兵训练后默认解锁",
    sourceLabel: "Helldivers Wiki",
    sourceUrl: "https://helldivers.wiki.gg/wiki/AR-23_Liberator",
    sourceRevision: "页面数据更新至 1.004.100",
  },
};

export const getWeaponDetail = (itemId: string) => weaponDetails[itemId];
