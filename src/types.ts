export const DIMENSIONS = [
  "horde",
  "medium",
  "heavy",
  "burst",
  "control",
  "survival",
  "sustain",
  "utility",
] as const;

export type DimensionId = (typeof DIMENSIONS)[number];
export type DimensionMap = Record<DimensionId, number>;

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  horde: "清杂",
  medium: "中甲处理",
  heavy: "反重甲",
  burst: "单体爆发",
  control: "控场",
  survival: "生存与机动",
  sustain: "持续作战",
  utility: "任务与支援",
};

export type ItemSlot =
  | "armor"
  | "primary"
  | "secondary"
  | "throwable"
  | "stratagem"
  | "booster";

export interface CatalogItem {
  id: string;
  slot: ItemSlot;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  category: string;
  roles: string[];
  tags: string[];
  description: string;
  contributions: DimensionMap;
  contextModifiers?: Partial<Record<FactionId, Partial<DimensionMap>>>;
}

export type FactionId = "terminids" | "automatons" | "illuminate";
export type DifficultyTier = "low" | "mid" | "high";

export interface FactionProfile {
  id: FactionId;
  nameZh: string;
  nameEn: string;
  signal: string;
  weights: DimensionMap;
  critical: DimensionId[];
}

export interface MissionProfile {
  id: string;
  nameZh: string;
  nameEn: string;
  duration: "short" | "standard" | "long";
  weightDelta: Partial<DimensionMap>;
  critical: DimensionId[];
}

export interface DifficultyProfile {
  level: number;
  nameZh: string;
  tier: DifficultyTier;
  weightDelta: Partial<DimensionMap>;
}

export interface RuleAdjustment {
  dimension: DimensionId;
  value: number;
}

export interface SynergyRule {
  id: string;
  type: "synergy" | "conflict";
  label: string;
  requiresTags: string[];
  adjustments: RuleAdjustment[];
}

export interface CatalogBundle {
  schemaVersion: 1;
  dataVersion: string;
  releasedAt: string;
  items: CatalogItem[];
  factions: FactionProfile[];
  missions: MissionProfile[];
  difficulties: DifficultyProfile[];
  rules: SynergyRule[];
  sources: { label: string; url: string; note: string }[];
}

export interface LoadoutSelection {
  armorId?: string;
  primaryId?: string;
  secondaryId?: string;
  throwableId?: string;
  stratagemIds: string[];
  boosterId?: string;
}

export interface CombatContext {
  factionId: FactionId;
  difficulty: number;
  missionId: string;
}

export interface Loadout {
  schemaVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  dataVersion: string;
  selection: LoadoutSelection;
  context: CombatContext;
}

export interface RuleHit {
  id: string;
  type: "synergy" | "conflict" | "cap";
  label: string;
  adjustments?: RuleAdjustment[];
}

export interface ReplacementCandidate {
  slot: ItemSlot;
  index?: number;
  fromItemId: string;
  toItemId: string;
  beforeScore: number;
  afterScore: number;
  delta: number;
  reason: string;
}

export interface EvaluationResult {
  complete: boolean;
  dimensions: DimensionMap;
  weights: DimensionMap;
  rawScore: number | null;
  finalScore: number | null;
  scoreCap: number | null;
  criticalDimensions: DimensionId[];
  warnings: string[];
  ruleHits: RuleHit[];
  replacements: ReplacementCandidate[];
  durationMs: number;
}

export interface AiReport {
  summary: string;
  strengths: string[];
  risks: string[];
  replacements: { itemId: string; explanation: string }[];
}

export interface AiSettings {
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}

export interface AppState {
  savedLoadouts: Loadout[];
  ownedItemIds: string[];
  inventoryEnabled: boolean;
  ai: AiSettings;
  aiCache: Record<string, AiReport>;
  lastCatalogCheck?: string;
}
