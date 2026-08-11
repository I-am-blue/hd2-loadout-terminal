import type {
  CatalogBundle,
  CatalogItem,
  DimensionMap,
  FactionId,
  ItemSlot,
} from "../types";

const d = (
  horde: number,
  medium: number,
  heavy: number,
  burst: number,
  control: number,
  survival: number,
  sustain: number,
  utility: number,
): DimensionMap => ({ horde, medium, heavy, burst, control, survival, sustain, utility });

type ItemSeed = [nameEn: string, nameZh: string, profile: string, tags?: string[]];

const profiles: Record<string, DimensionMap> = {
  armor_scout: d(0, 0, 0, 0, 4, 19, 4, 14),
  armor_tank: d(0, 0, 0, 0, 5, 22, 5, 4),
  armor_supply: d(2, 1, 0, 2, 4, 13, 17, 8),
  armor_resist: d(0, 0, 0, 0, 8, 20, 6, 4),
  armor_weapon: d(2, 3, 0, 4, 2, 12, 15, 5),
  ar: d(13, 12, 3, 8, 5, 3, 16, 3),
  smg: d(17, 9, 2, 8, 6, 5, 14, 5),
  shotgun: d(18, 10, 2, 14, 8, 4, 10, 2),
  marksman: d(5, 18, 7, 16, 3, 2, 12, 4),
  energy: d(13, 15, 7, 12, 7, 3, 20, 4),
  explosive: d(12, 18, 13, 20, 12, 1, 7, 9),
  special: d(10, 14, 7, 15, 9, 4, 10, 8),
  pistol: d(7, 8, 2, 9, 3, 4, 11, 2),
  melee: d(5, 9, 2, 10, 6, 7, 24, 2),
  support: d(2, 2, 0, 2, 5, 7, 14, 20),
  grenade_frag: d(16, 9, 2, 11, 8, 0, 3, 7),
  grenade_he: d(12, 16, 9, 18, 6, 0, 2, 8),
  grenade_control: d(7, 7, 1, 4, 22, 4, 5, 12),
  grenade_at: d(2, 12, 23, 23, 3, 0, 2, 8),
  eagle_horde: d(24, 16, 5, 17, 14, 0, 13, 7),
  eagle_at: d(10, 18, 25, 25, 8, 0, 10, 9),
  orbital_horde: d(24, 18, 8, 17, 16, 0, 10, 8),
  orbital_at: d(8, 18, 25, 25, 9, 0, 7, 10),
  support_horde: d(22, 16, 5, 15, 10, 4, 20, 5),
  support_medium: d(12, 23, 12, 22, 7, 3, 16, 7),
  support_at: d(4, 14, 25, 25, 4, 2, 11, 8),
  backpack: d(7, 7, 2, 5, 8, 22, 17, 12),
  mobility: d(2, 2, 0, 2, 7, 25, 12, 17),
  sentry_horde: d(25, 16, 6, 15, 19, 2, 19, 10),
  sentry_at: d(12, 22, 23, 23, 16, 2, 15, 10),
  emplacement: d(19, 21, 18, 22, 15, 8, 17, 12),
  vehicle: d(22, 22, 23, 24, 17, 18, 9, 15),
  booster_survival: d(0, 0, 0, 0, 5, 20, 9, 12),
  booster_sustain: d(2, 1, 0, 2, 3, 9, 22, 12),
  booster_mobility: d(1, 1, 0, 1, 4, 21, 14, 13),
  booster_utility: d(1, 1, 0, 1, 7, 8, 8, 24),
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const makeItems = (
  slot: ItemSlot,
  category: string,
  seeds: ItemSeed[],
): CatalogItem[] =>
  seeds.map(([nameEn, nameZh, profile, extraTags = []]) => ({
    id: `${slot}-${slug(nameEn)}`,
    slot,
    nameZh,
    nameEn,
    aliases: [nameEn.split(" ")[0], ...extraTags],
    category,
    roles: extraTags,
    tags: [...new Set([slot, profile, ...extraTags])],
    description: `以 ${category} 的战术定位归一化评估，能力值随数据版本持续校准。`,
    contributions: profiles[profile],
  }));

const armorSeeds: ItemSeed[] = [
  ["Standard Issue", "制式装甲", "armor_tank", ["balanced"]],
  ["Oxygenator", "供氧系统", "armor_scout", ["mobility"]],
  ["Concussive Padding, Grenadier", "震荡衬垫·掷弹兵", "armor_supply", ["grenade", "explosive-resist"]],
  ["Concussive Padding, Hazmat", "震荡衬垫·防化", "armor_resist", ["gas", "explosive-resist"]],
  ["Concussive Padding, Reinforced", "震荡衬垫·强化", "armor_tank", ["explosive-resist"]],
  ["Reduced Signature", "低可探测特征", "armor_scout", ["stealth"]],
  ["Supplementary Adrenaline", "辅助肾上腺素", "armor_scout", ["stamina"]],
  ["Rock Solid", "坚如磐石", "armor_tank", ["melee"]],
  ["Desert Stormer", "沙暴突击者", "armor_resist", ["elemental-resist"]],
  ["Feet First", "双脚先行", "armor_scout", ["stealth", "scout"]],
  ["Adreno-Defibrillator", "肾上腺除颤器", "armor_resist", ["stim", "arc-resist"]],
  ["Ballistic Padding", "弹道衬垫", "armor_tank", ["explosive-resist"]],
  ["Reinforced Epaulettes", "强化肩章", "armor_weapon", ["reload", "melee"]],
  ["Gunslinger", "神枪手", "armor_weapon", ["secondary"]],
  ["Integrated Explosives", "集成炸药", "armor_supply", ["grenade", "explosive"]],
  ["Acclimated", "环境适应", "armor_resist", ["elemental-resist"]],
  ["Siege-Ready", "攻城准备", "armor_weapon", ["reload", "ammo"]],
  ["Unflinching", "坚定不移", "armor_tank", ["radar"]],
  ["Advanced Filtration", "高级过滤", "armor_resist", ["gas"]],
  ["Inflammable", "阻燃", "armor_resist", ["fire"]],
  ["Peak Physique", "巅峰体魄", "armor_weapon", ["handling", "melee"]],
  ["Electrical Conduit", "电气导管", "armor_resist", ["arc-resist"]],
  ["Fortified", "强化防护", "armor_tank", ["recoil", "explosive-resist"]],
  ["Scout", "侦察", "armor_scout", ["stealth", "radar"]],
  ["Engineering Kit", "工程套件", "armor_supply", ["grenade", "recoil"]],
  ["Med-Kit", "医疗套件", "armor_supply", ["stim"]],
  ["Servo-Assisted", "伺服辅助", "armor_weapon", ["throw-range"]],
  ["Democracy Protects", "民主护佑", "armor_tank", ["survival"]],
  ["Extra Padding", "额外衬垫", "armor_tank", ["armor"]],
];

const primarySeeds: ItemSeed[] = [
  ["AR-2 Coyote", "AR-2 郊狼", "ar"], ["AR-23 Liberator", "AR-23 解放者", "ar"],
  ["AR-23A Liberator Carbine", "AR-23A 解放者卡宾枪", "ar"], ["AR-23C Liberator Concussive", "AR-23C 震荡解放者", "ar", ["control"]],
  ["AR-23P Liberator Penetrator", "AR-23P 穿透解放者", "ar", ["medium-pen"]], ["AR-32 Pacifier", "AR-32 和平使者", "ar", ["control"]],
  ["AR-59 Suppressor", "AR-59 压制者", "ar"], ["AR-61 Tenderizer", "AR-61 嫩化者", "ar"],
  ["ARC-12 Blitzer", "ARC-12 电弧喷射枪", "energy", ["arc", "control"]], ["BR-14 Adjudicator", "BR-14 审判者", "marksman", ["medium-pen"]],
  ["CB-9 Exploding Crossbow", "CB-9 爆炸弩", "explosive", ["explosive"]], ["DBS-2 Double Freedom", "DBS-2 双重自由", "shotgun"],
  ["FLAM-66 Torcher", "FLAM-66 火炬", "special", ["fire"]], ["JAR-5 Dominator", "JAR-5 主宰", "marksman", ["medium-pen"]],
  ["LAS-13 Trident", "LAS-13 三叉戟", "energy", ["laser"]], ["LAS-16 Sickle", "LAS-16 镰刀", "energy", ["laser"]],
  ["LAS-17 Double-Edge Sickle", "LAS-17 双刃镰刀", "energy", ["laser"]], ["LAS-5 Scythe", "LAS-5 长柄镰", "energy", ["laser"]],
  ["M7S SMG", "M7S 冲锋枪", "smg"], ["M90A Shotgun", "M90A 霰弹枪", "shotgun"],
  ["MA5C Assault Rifle", "MA5C 突击步枪", "ar"], ["MP-98 Knight", "MP-98 骑士", "smg"],
  ["PLAS-1 Scorcher", "PLAS-1 焦土", "energy", ["explosive"]], ["PLAS-101 Purifier", "PLAS-101 净化者", "energy", ["charge", "control"]],
  ["PLAS-39 Accelerator Rifle", "PLAS-39 加速步枪", "energy", ["charge"]], ["R-2 Amendment", "R-2 修正案", "marksman"],
  ["R-2124 Constitution", "R-2124 宪法", "marksman"], ["R-36 Eruptor", "R-36 喷发者", "explosive", ["explosive"]],
  ["R-6 Deadeye", "R-6 死眼", "marksman"], ["R-63 Diligence", "R-63 勤勉", "marksman"],
  ["R-63CS Diligence Counter Sniper", "R-63CS 反狙勤勉", "marksman", ["medium-pen"]], ["R-72 Censor", "R-72 审查者", "marksman"],
  ["SG-20 Halt", "SG-20 停止者", "shotgun", ["control"]], ["SG-225 Breaker", "SG-225 破裂者", "shotgun"],
  ["SG-225IE Breaker Incendiary", "SG-225IE 燃烧破裂者", "shotgun", ["fire"]], ["SG-225SP Breaker Spray & Pray", "SG-225SP 喷洒祈祷", "shotgun"],
  ["SG-451 Cookout", "SG-451 烤肉", "shotgun", ["fire", "control"]], ["SG-8 Punisher", "SG-8 惩罚者", "shotgun"],
  ["SG-8P Punisher Plasma", "SG-8P 等离子惩罚者", "energy", ["explosive", "control"]], ["SG-8S Slugger", "SG-8S 猛击者", "shotgun", ["medium-pen"]],
  ["SG-97 Sweeper", "SG-97 清扫者", "shotgun"], ["SMG-203 Gallant", "SMG-203 勇士", "smg"],
  ["SMG-32 Reprimand", "SMG-32 训诫", "smg", ["medium-pen"]], ["SMG-37 Defender", "SMG-37 防卫者", "smg"],
  ["SMG-72 Pummeler", "SMG-72 猛击者", "smg", ["control"]], ["StA-11 SMG", "StA-11 冲锋枪", "smg"],
  ["StA-52 Assault Rifle", "StA-52 突击步枪", "ar"], ["VG-70 Variable", "VG-70 可变式", "special"],
];

const secondarySeeds: ItemSeed[] = [
  ["CQC-19 Stun Lance", "CQC-19 电击长枪", "melee", ["stun"]], ["CQC-2 Saber", "CQC-2 军刀", "melee"],
  ["CQC-30 Stun Baton", "CQC-30 电击棍", "melee", ["stun"]], ["CQC-42 Machete", "CQC-42 砍刀", "melee"],
  ["CQC-5 Combat Hatchet", "CQC-5 战斧", "melee"], ["GP-20 Ultimatum", "GP-20 最后通牒", "explosive", ["anti-tank"]],
  ["GP-31 Grenade Pistol", "GP-31 榴弹手枪", "explosive", ["explosive"]], ["LAS-58 Talon", "LAS-58 利爪", "energy"],
  ["LAS-7 Dagger", "LAS-7 匕首", "energy"], ["P-11 Stim Pistol", "P-11 治疗手枪", "support", ["heal"]],
  ["P-113 Verdict", "P-113 裁决", "pistol"], ["P-19 Redeemer", "P-19 救赎者", "pistol"],
  ["P-2 Peacemaker", "P-2 和平制造者", "pistol"], ["P-33 Missile Pistol", "P-33 导弹手枪", "explosive"],
  ["P-35 Re-Educator", "P-35 再教育者", "special", ["control"]], ["P-4 Senator", "P-4 参议员", "marksman", ["medium-pen"]],
  ["P-69 Veto", "P-69 否决", "pistol"], ["P-72 Crisper", "P-72 脆化者", "special", ["fire"]],
  ["P-92 Warrant", "P-92 搜查令", "pistol"], ["PLAS-15 Loyalist", "PLAS-15 忠诚者", "energy", ["charge"]],
  ["SG-22 Bushwhacker", "SG-22 灌木清理者", "shotgun"],
];

const throwableSeeds: ItemSeed[] = [
  ["G-10 Incendiary", "G-10 燃烧弹", "grenade_frag", ["fire"]], ["G-109 Urchin", "G-109 海胆", "grenade_control", ["control"]],
  ["G-12 High Explosive", "G-12 高爆弹", "grenade_he", ["explosive"]], ["G-123 Thermite", "G-123 铝热弹", "grenade_at", ["anti-tank", "fire"]],
  ["G-13 Incendiary Impact", "G-13 冲击燃烧弹", "grenade_frag", ["fire"]], ["G-142 Pyrotech", "G-142 烟火弹", "grenade_frag", ["fire"]],
  ["G-16 Impact", "G-16 冲击弹", "grenade_he", ["explosive"]], ["G-23 Stun", "G-23 眩晕弹", "grenade_control", ["stun"]],
  ["G-3 Smoke", "G-3 烟雾弹", "grenade_control", ["smoke"]], ["G-31 Arc", "G-31 电弧弹", "grenade_control", ["arc"]],
  ["G-4 Gas", "G-4 毒气弹", "grenade_control", ["gas"]], ["G-48 Giga Grenade", "G-48 巨型手雷", "grenade_he", ["explosive"]],
  ["G-50 Seeker", "G-50 追踪弹", "grenade_he", ["guided"]], ["G-6 Frag", "G-6 破片弹", "grenade_frag", ["explosive"]],
  ["G-7 Pineapple", "G-7 菠萝弹", "grenade_frag", ["explosive"]], ["G-89 Smokescreen", "G-89 烟幕弹", "grenade_control", ["smoke"]],
  ["K-2 Throwing Knife", "K-2 飞刀", "grenade_control", ["stealth"]], ["TED-63 Dynamite", "TED-63 炸药", "grenade_at", ["explosive"]],
  ["TM-1 Lure Mine", "TM-1 诱饵雷", "grenade_control", ["mine"]],
];

const stratagemSeeds: ItemSeed[] = [
  ["Eagle Strafing Run", "飞鹰机枪扫射", "eagle_horde", ["eagle"]], ["Eagle Airstrike", "飞鹰空袭", "eagle_at", ["eagle", "explosive"]],
  ["Eagle Cluster Bomb", "飞鹰集束炸弹", "eagle_horde", ["eagle", "explosive"]], ["Eagle Napalm Airstrike", "飞鹰凝固汽油弹空袭", "eagle_horde", ["eagle", "fire"]],
  ["Eagle Smoke Strike", "飞鹰烟雾攻击", "eagle_horde", ["eagle", "smoke"]], ["Eagle 110MM Rocket Pods", "飞鹰 110MM 火箭巢", "eagle_at", ["eagle", "anti-tank"]],
  ["Eagle 500KG Bomb", "飞鹰 500KG 炸弹", "eagle_at", ["eagle", "anti-tank"]], ["Fast Recon Vehicle", "快速侦察载具", "vehicle", ["vehicle", "mobility"]],
  ["Jump Pack", "喷气背包", "mobility", ["backpack", "mobility"]], ["Hover Pack", "悬浮背包", "mobility", ["backpack", "mobility"]],
  ["Orbital Precision Strike", "轨道精准攻击", "orbital_at", ["orbital", "anti-tank"]], ["Orbital Gas Strike", "轨道毒气攻击", "orbital_horde", ["orbital", "gas"]],
  ["Orbital EMS Strike", "轨道电磁攻击", "orbital_horde", ["orbital", "stun"]], ["Orbital Smoke Strike", "轨道烟雾攻击", "orbital_horde", ["orbital", "smoke"]],
  ["Orbital 120MM HE Barrage", "轨道 120MM 高爆弹幕", "orbital_horde", ["orbital", "explosive"]], ["Orbital 380MM HE Barrage", "轨道 380MM 高爆弹幕", "orbital_at", ["orbital", "explosive"]],
  ["Orbital Walking Barrage", "轨道行走弹幕", "orbital_at", ["orbital", "explosive"]], ["Orbital Laser", "轨道激光", "orbital_at", ["orbital", "laser"]],
  ["Orbital Railcannon Strike", "轨道磁轨炮攻击", "orbital_at", ["orbital", "anti-tank"]], ["Orbital Airburst Strike", "轨道空爆攻击", "orbital_horde", ["orbital"]],
  ["Orbital Gatling Barrage", "轨道加特林弹幕", "orbital_horde", ["orbital"]], ["Orbital Napalm Barrage", "轨道凝固汽油弹幕", "orbital_horde", ["orbital", "fire"]],
  ["Machine Gun", "机枪", "support_horde", ["support-weapon"]], ["Anti-Materiel Rifle", "反器材步枪", "support_medium", ["support-weapon", "medium-pen"]],
  ["Stalwart", "盟友", "support_horde", ["support-weapon"]], ["Expendable Anti-Tank", "消耗性反坦克武器", "support_at", ["support-weapon", "anti-tank"]],
  ["Recoilless Rifle", "无后坐力步枪", "support_at", ["support-weapon", "anti-tank", "backpack"]], ["Flamethrower", "火焰喷射器", "support_horde", ["support-weapon", "fire"]],
  ["Autocannon", "机炮", "support_medium", ["support-weapon", "backpack"]], ["Heavy Machine Gun", "重机枪", "support_medium", ["support-weapon"]],
  ["Airburst Rocket Launcher", "空爆火箭发射器", "support_horde", ["support-weapon", "backpack"]], ["Commando", "突击队", "support_at", ["support-weapon", "anti-tank"]],
  ["Railgun", "磁轨炮", "support_medium", ["support-weapon", "charge"]], ["Spear", "长矛", "support_at", ["support-weapon", "anti-tank", "backpack"]],
  ["StA-X3 W.A.S.P. Launcher", "StA-X3 黄蜂发射器", "support_at", ["support-weapon", "guided"]],
  ["Arc Thrower", "电弧发射器", "support_horde", ["support-weapon", "arc", "control"]], ["Grenade Launcher", "榴弹发射器", "support_horde", ["support-weapon", "explosive"]],
  ["Laser Cannon", "激光大炮", "support_medium", ["support-weapon", "laser"]], ["Quasar Cannon", "类星体加农炮", "support_at", ["support-weapon", "anti-tank", "laser"]],
  ["Sterilizer", "消毒器", "support_horde", ["support-weapon", "gas", "control"]], ["GL-52 De-Escalator", "GL-52 降级者", "support_medium", ["support-weapon"]],
  ["Epoch", "纪元", "support_at", ["support-weapon", "charge"]], ["Expendable Napalm", "消耗性凝固汽油弹", "support_horde", ["support-weapon", "fire"]],
  ["Solo Silo", "单兵发射井", "support_at", ["support-weapon", "anti-tank"]], ["Speargun", "鱼叉枪", "support_medium", ["support-weapon"]],
  ["Cremator", "火葬者", "support_horde", ["support-weapon", "fire"]], ["Defoliation Tool", "除叶工具", "support_horde", ["support-weapon"]],
  ["Maxigun", "巨型机枪", "support_horde", ["support-weapon"]], ["C4 Pack", "C4 炸药包", "support_at", ["explosive", "anti-tank"]],
  ["CQC-20", "CQC-20", "support_medium", ["support-weapon", "melee"]], ["EAT-411", "EAT-411", "support_at", ["support-weapon", "anti-tank"]],
  ["GL-28", "GL-28", "support_horde", ["support-weapon", "explosive"]],
  ["Ballistic Shield Backpack", "防弹护盾背包", "backpack", ["backpack", "shield"]], ["Guard Dog Rover", "护卫犬漫游者", "backpack", ["backpack", "laser"]],
  ["Shield Generator Pack", "护盾发生器背包", "backpack", ["backpack", "shield"]], ["Supply Pack", "补给背包", "backpack", ["backpack", "supply"]],
  ["Guard Dog", "护卫犬", "backpack", ["backpack"]], ["Guard Dog Breath", "毒息护卫犬", "backpack", ["backpack", "gas"]],
  ["Guard Dog K-9", "K-9 护卫犬", "backpack", ["backpack", "stun"]], ["Guard Dog Hot Dog", "热狗护卫犬", "backpack", ["backpack", "fire"]],
  ["Warp Pack", "跃迁背包", "mobility", ["backpack", "mobility"]], ["Directional Shield", "定向护盾", "backpack", ["backpack", "shield"]],
  ["Hellbomb Portable", "便携式地狱火炸弹", "backpack", ["backpack", "explosive"]],
  ["Machine Gun Sentry", "机枪哨戒炮", "sentry_horde", ["sentry"]], ["Gatling Sentry", "加特林哨戒炮", "sentry_horde", ["sentry"]],
  ["Mortar Sentry", "迫击炮哨戒炮", "sentry_horde", ["sentry", "explosive"]], ["EMS Mortar Sentry", "电磁迫击炮哨戒炮", "sentry_horde", ["sentry", "stun"]],
  ["Autocannon Sentry", "机炮哨戒炮", "sentry_at", ["sentry", "anti-tank"]], ["Rocket Sentry", "火箭哨戒炮", "sentry_at", ["sentry", "anti-tank"]],
  ["Laser Sentry", "激光哨戒炮", "sentry_at", ["sentry", "laser"]], ["Gas Mortar Sentry", "毒气迫击炮哨戒炮", "sentry_horde", ["sentry", "gas"]],
  ["Flame Sentry", "火焰哨戒炮", "sentry_horde", ["sentry", "fire"]],
  ["Anti-Personnel Minefield", "反步兵雷区", "sentry_horde", ["mine"]], ["Incendiary Mines", "燃烧地雷", "sentry_horde", ["mine", "fire"]],
  ["Anti-Tank Mines", "反坦克地雷", "sentry_at", ["mine", "anti-tank"]], ["Gas Mine", "毒气地雷", "sentry_horde", ["mine", "gas"]],
  ["Tesla Tower", "特斯拉塔", "sentry_horde", ["sentry", "arc"]],
  ["HMG Emplacement", "重机枪阵地", "emplacement", ["emplacement"]], ["Grenadier Battlement", "掷弹兵壁垒", "emplacement", ["emplacement", "explosive"]],
  ["Anti-Tank Emplacement", "反坦克阵地", "emplacement", ["emplacement", "anti-tank"]], ["Shield Generator Relay", "护盾发生器中继", "emplacement", ["emplacement", "shield"]],
  ["Patriot Exosuit", "爱国者外骨骼装甲", "vehicle", ["vehicle", "anti-tank"]], ["Emancipator Exosuit", "解放者外骨骼装甲", "vehicle", ["vehicle", "anti-tank"]],
  ["Breakthrough Exosuit", "突破者外骨骼装甲", "vehicle", ["vehicle"]], ["Lumberer Exosuit", "伐木者外骨骼装甲", "vehicle", ["vehicle", "fire"]],
  ["Bullet Storm", "子弹风暴", "vehicle", ["vehicle"]], ["Bastion MK XVI", "堡垒 MK XVI", "vehicle", ["vehicle", "anti-tank"]],
  ["One True Flag", "唯一真旗", "emplacement", ["emplacement", "support"]],
];

const boosterSeeds: ItemSeed[] = [
  ["Hellpod Space Optimization", "地狱舱空间优化", "booster_sustain", ["supply"]], ["Vitality Enhancement", "活力强化", "booster_survival", ["health"]],
  ["UAV Recon Booster", "无人机侦察强化", "booster_utility", ["radar"]], ["Stamina Enhancement", "耐力强化", "booster_mobility", ["stamina"]],
  ["Muscle Enhancement", "肌肉强化", "booster_mobility", ["terrain"]], ["Increased Reinforcement Budget", "增援预算增加", "booster_utility", ["reinforcement"]],
  ["Flexible Reinforcement Budget", "灵活增援预算", "booster_utility", ["reinforcement"]], ["Localization Confusion", "定位干扰", "booster_utility", ["encounter"]],
  ["Expert Extraction Pilot", "专家撤离飞行员", "booster_utility", ["extract"]], ["Motivational Shocks", "激励电击", "booster_survival", ["slow-resist"]],
  ["Experimental Infusion", "实验性药剂", "booster_survival", ["stim", "mobility"]], ["Firebomb Hellpods", "火焰地狱舱", "booster_utility", ["fire"]],
  ["Dead Sprint", "死亡冲刺", "booster_mobility", ["stamina"]], ["Armed Resupply Pods", "武装补给舱", "booster_sustain", ["supply"]],
  ["Sample Extricator", "样本提取器", "booster_utility", ["sample"]], ["Sample Scanner", "样本扫描器", "booster_utility", ["sample"]],
  ["Stun Pods", "眩晕舱", "booster_utility", ["stun"]], ["Concealed Insertion", "隐蔽投送", "booster_utility", ["smoke"]],
];

const items: CatalogItem[] = [
  ...makeItems("armor", "护甲战斗配置", armorSeeds),
  ...makeItems("primary", "主武器", primarySeeds),
  ...makeItems("secondary", "副武器", secondarySeeds),
  ...makeItems("throwable", "手雷", throwableSeeds),
  ...makeItems("stratagem", "战备", stratagemSeeds),
  ...makeItems("booster", "被动", boosterSeeds),
];

const addContext = (
  item: CatalogItem,
  faction: FactionId,
  dimensions: Partial<DimensionMap>,
) => {
  item.contextModifiers = {
    ...item.contextModifiers,
    [faction]: { ...(item.contextModifiers?.[faction] ?? {}), ...dimensions },
  };
};

for (const item of items) {
  if (item.tags.includes("fire") || item.tags.includes("gas")) {
    addContext(item, "terminids", { horde: 1.2, control: 1.15 });
  }
  if (item.tags.includes("medium-pen") || item.tags.includes("anti-tank")) {
    addContext(item, "automatons", { medium: 1.15, heavy: 1.1 });
  }
  if (item.tags.includes("arc") || item.tags.includes("control")) {
    addContext(item, "illuminate", { control: 1.2, medium: 1.1 });
  }
}

export const catalog: CatalogBundle = {
  schemaVersion: 1,
  dataVersion: "2026.08.11-r1",
  releasedAt: "2026-08-11T00:00:00+08:00",
  items,
  factions: [
    { id: "terminids", nameZh: "终结族", nameEn: "Terminids", signal: "生物威胁", weights: d(24, 13, 15, 10, 12, 10, 9, 7), critical: ["horde", "heavy"] },
    { id: "automatons", nameZh: "自动机", nameEn: "Automatons", signal: "机械威胁", weights: d(10, 20, 20, 14, 8, 12, 9, 7), critical: ["medium", "heavy"] },
    { id: "illuminate", nameZh: "光能者", nameEn: "Illuminate", signal: "异星威胁", weights: d(14, 17, 13, 11, 18, 11, 8, 8), critical: ["control", "medium"] },
  ],
  missions: [
    { id: "operations", nameZh: "标准行动", nameEn: "Standard Operation", duration: "standard", weightDelta: {}, critical: [] },
    { id: "eradicate", nameZh: "歼灭敌军", nameEn: "Eradicate Enemy Forces", duration: "short", weightDelta: { horde: 8, control: 5, utility: -4, sustain: -3 }, critical: ["horde"] },
    { id: "blitz", nameZh: "闪电战", nameEn: "Blitz", duration: "short", weightDelta: { burst: 4, survival: 6, utility: 7, sustain: -4 }, critical: ["utility"] },
    { id: "defense", nameZh: "高价值资产防御", nameEn: "Evacuate High-Value Assets", duration: "standard", weightDelta: { control: 8, horde: 5, utility: 3, survival: -2 }, critical: ["control", "horde"] },
    { id: "evacuation", nameZh: "人员撤离", nameEn: "Emergency Evacuation", duration: "standard", weightDelta: { control: 4, survival: 6, utility: 6 }, critical: ["survival"] },
    { id: "boss", nameZh: "高价值目标", nameEn: "Eliminate High-Value Target", duration: "short", weightDelta: { heavy: 9, burst: 8, horde: -4 }, critical: ["heavy", "burst"] },
    { id: "survey", nameZh: "地质勘探", nameEn: "Geological Survey", duration: "long", weightDelta: { sustain: 6, utility: 5, control: 3 }, critical: ["sustain"] },
    { id: "launch", nameZh: "发射洲际导弹", nameEn: "Launch ICBM", duration: "long", weightDelta: { sustain: 5, utility: 7, survival: 3 }, critical: ["utility", "sustain"] },
  ],
  difficulties: Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    const names = ["初次出征", "简单", "中等", "挑战", "困难", "极难", "自杀任务", "不可能", "绝地潜兵", "超级绝地潜兵"];
    return {
      level,
      nameZh: names[index],
      tier: level <= 3 ? "low" : level <= 6 ? "mid" : "high",
      weightDelta: level >= 7 ? { heavy: 3, survival: 2, sustain: 2 } : level >= 4 ? { medium: 2, control: 1 } : {},
    };
  }),
  rules: [
    { id: "fire-control", type: "synergy", label: "持续燃烧封锁", requiresTags: ["fire", "control"], adjustments: [{ dimension: "horde", value: 6 }, { dimension: "control", value: 4 }] },
    { id: "stun-at", type: "synergy", label: "定身反甲窗口", requiresTags: ["stun", "anti-tank"], adjustments: [{ dimension: "heavy", value: 6 }, { dimension: "burst", value: 4 }] },
    { id: "supply-support", type: "synergy", label: "补给型支援武器循环", requiresTags: ["supply", "support-weapon"], adjustments: [{ dimension: "sustain", value: 8 }] },
    { id: "stealth-mobility", type: "synergy", label: "低特征快速渗透", requiresTags: ["stealth", "mobility"], adjustments: [{ dimension: "survival", value: 5 }, { dimension: "utility", value: 5 }] },
    { id: "backpack-collision", type: "conflict", label: "背包槽位冲突", requiresTags: ["backpack", "backpack"], adjustments: [{ dimension: "utility", value: -8 }, { dimension: "sustain", value: -4 }] },
    { id: "eagle-density", type: "conflict", label: "飞鹰重整期间火力真空", requiresTags: ["eagle", "eagle", "eagle"], adjustments: [{ dimension: "sustain", value: -7 }] },
  ],
  sources: [
    { label: "Helldivers Wiki", url: "https://helldivers.wiki.gg/", note: "装备事实与机制交叉核对；不打包其许可不明素材。" },
    { label: "Helldivers Stats", url: "https://helldiversstats.com/weapons", note: "发布时目录完整性核对。" },
    { label: "helldivers-2/api", url: "https://github.com/helldivers-2/api", note: "非官方社区 API，仅作开发期参考。" },
  ],
};

export const emptyDimensions = (): DimensionMap => d(0, 0, 0, 0, 0, 0, 0, 0);
