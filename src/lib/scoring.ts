import { catalog as defaultCatalog } from "../data/catalog";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  type CatalogBundle,
  type CatalogItem,
  type CombatContext,
  type DimensionId,
  type DimensionMap,
  type EvaluationResult,
  type ItemSlot,
  type LoadoutSelection,
  type ReplacementCandidate,
  type RuleHit,
} from "../types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const isCompleteSelection = (selection: LoadoutSelection) =>
  Boolean(
    selection.armorId &&
      selection.primaryId &&
      selection.secondaryId &&
      selection.throwableId &&
      selection.boosterId &&
      selection.stratagemIds.length === 4 &&
      new Set(selection.stratagemIds).size === 4,
  );

export const selectedIds = (selection: LoadoutSelection) =>
  [
    selection.armorId,
    selection.primaryId,
    selection.secondaryId,
    selection.throwableId,
    ...selection.stratagemIds,
    selection.boosterId,
  ].filter((value): value is string => Boolean(value));

const normalizeWeights = (weights: DimensionMap): DimensionMap => {
  const safe = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, Math.max(0, weights[dimension])]),
  ) as DimensionMap;
  const total = DIMENSIONS.reduce((sum, dimension) => sum + safe[dimension], 0) || 1;
  return Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, safe[dimension] / total]),
  ) as DimensionMap;
};

const contextWeights = (context: CombatContext, bundle: CatalogBundle) => {
  const faction = bundle.factions.find((candidate) => candidate.id === context.factionId)!;
  const mission = bundle.missions.find((candidate) => candidate.id === context.missionId)!;
  const difficulty = bundle.difficulties.find((candidate) => candidate.level === context.difficulty)!;

  const combined = Object.fromEntries(
    DIMENSIONS.map((dimension) => [
      dimension,
      faction.weights[dimension] +
        (mission.weightDelta[dimension] ?? 0) +
        (difficulty.weightDelta[dimension] ?? 0),
    ]),
  ) as DimensionMap;

  return normalizeWeights(combined);
};

const requirementsMet = (required: string[], items: CatalogItem[]) => {
  const available = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) available.set(tag, (available.get(tag) ?? 0) + 1);
  }
  const needed = new Map<string, number>();
  for (const tag of required) needed.set(tag, (needed.get(tag) ?? 0) + 1);
  return [...needed].every(([tag, count]) => (available.get(tag) ?? 0) >= count);
};

interface CoreEvaluation extends Omit<EvaluationResult, "replacements" | "durationMs"> {}

const evaluateCore = (
  selection: LoadoutSelection,
  context: CombatContext,
  bundle: CatalogBundle,
): CoreEvaluation => {
  const index = new Map(bundle.items.map((item) => [item.id, item]));
  const items = selectedIds(selection)
    .map((id) => index.get(id))
    .filter((item): item is CatalogItem => Boolean(item));
  const weights = contextWeights(context, bundle);
  const ruleHits: RuleHit[] = [];

  const dimensionAdjustments = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, 0]),
  ) as DimensionMap;

  for (const rule of bundle.rules) {
    if (!requirementsMet(rule.requiresTags, items)) continue;
    for (const adjustment of rule.adjustments) {
      dimensionAdjustments[adjustment.dimension] = clamp(
        dimensionAdjustments[adjustment.dimension] + adjustment.value,
        -10,
        10,
      );
    }
    ruleHits.push({ id: rule.id, type: rule.type, label: rule.label, adjustments: rule.adjustments });
  }

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const values = items
        .map((item) => {
          const modifier = item.contextModifiers?.[context.factionId]?.[dimension] ?? 1;
          return item.contributions[dimension] * modifier;
        })
        .sort((a, b) => b - a);
      const value = values.reduce((sum, contribution, index) => {
        const factor = index < 2 ? 1 : index < 4 ? 0.6 : 0.35;
        return sum + contribution * factor;
      }, 0);
      return [dimension, Math.round(clamp(value + dimensionAdjustments[dimension], 0, 100))];
    }),
  ) as DimensionMap;

  const complete = isCompleteSelection(selection);
  const rawScore = complete
    ? Math.round(DIMENSIONS.reduce((sum, dimension) => sum + dimensions[dimension] * weights[dimension], 0))
    : null;

  const faction = bundle.factions.find((candidate) => candidate.id === context.factionId)!;
  const mission = bundle.missions.find((candidate) => candidate.id === context.missionId)!;
  const difficulty = bundle.difficulties.find((candidate) => candidate.level === context.difficulty)!;
  const criticalDimensions = [...new Set([...faction.critical, ...mission.critical])];
  const warnings: string[] = [];

  for (const dimension of criticalDimensions) {
    if (dimensions[dimension] < (difficulty.tier === "high" ? 35 : 25)) {
      warnings.push(`${DIMENSION_LABELS[dimension]}为当前战局关键能力，现有覆盖仅 ${dimensions[dimension]}。`);
    }
  }

  for (const hit of ruleHits.filter((candidate) => candidate.type === "conflict")) {
    warnings.push(`配置冲突：${hit.label}。`);
  }

  let scoreCap: number | null = null;
  if (complete && difficulty.tier === "mid") {
    if (criticalDimensions.some((dimension) => dimensions[dimension] < 15)) scoreCap = 69;
    else if (criticalDimensions.some((dimension) => dimensions[dimension] < 25)) scoreCap = 79;
  }
  if (complete && difficulty.tier === "high") {
    if (criticalDimensions.some((dimension) => dimensions[dimension] < 20)) scoreCap = 59;
    else if (criticalDimensions.some((dimension) => dimensions[dimension] < 35)) scoreCap = 69;
  }

  if (scoreCap !== null) {
    const capped = criticalDimensions
      .filter((dimension) => dimensions[dimension] < (difficulty.tier === "high" ? 35 : 25))
      .map((dimension) => DIMENSION_LABELS[dimension])
      .join("、");
    ruleHits.push({ id: `coverage-cap-${scoreCap}`, type: "cap", label: `关键缺口封顶：${capped}，最高 ${scoreCap} 分` });
  }

  return {
    complete,
    dimensions,
    weights,
    rawScore,
    finalScore: rawScore === null ? null : scoreCap === null ? rawScore : Math.min(rawScore, scoreCap),
    scoreCap,
    criticalDimensions,
    warnings,
    ruleHits,
  };
};

const replaceAt = (
  selection: LoadoutSelection,
  slot: ItemSlot,
  itemId: string,
  index?: number,
): LoadoutSelection => {
  const next = { ...selection, stratagemIds: [...selection.stratagemIds] };
  if (slot === "stratagem" && index !== undefined) next.stratagemIds[index] = itemId;
  if (slot === "armor") next.armorId = itemId;
  if (slot === "primary") next.primaryId = itemId;
  if (slot === "secondary") next.secondaryId = itemId;
  if (slot === "throwable") next.throwableId = itemId;
  if (slot === "booster") next.boosterId = itemId;
  return next;
};

const replacementTargets = (selection: LoadoutSelection) => {
  const targets: { slot: ItemSlot; itemId: string; index?: number }[] = [];
  if (selection.armorId) targets.push({ slot: "armor", itemId: selection.armorId });
  if (selection.primaryId) targets.push({ slot: "primary", itemId: selection.primaryId });
  if (selection.secondaryId) targets.push({ slot: "secondary", itemId: selection.secondaryId });
  if (selection.throwableId) targets.push({ slot: "throwable", itemId: selection.throwableId });
  selection.stratagemIds.forEach((itemId, index) => targets.push({ slot: "stratagem", itemId, index }));
  if (selection.boosterId) targets.push({ slot: "booster", itemId: selection.boosterId });
  return targets;
};

const buildReplacements = (
  selection: LoadoutSelection,
  context: CombatContext,
  base: CoreEvaluation,
  bundle: CatalogBundle,
  ownedItemIds?: Set<string>,
): ReplacementCandidate[] => {
  if (!base.complete || base.finalScore === null) return [];
  const selected = new Set(selectedIds(selection));
  const deficits = [...DIMENSIONS].sort(
    (a, b) => base.dimensions[a] - base.dimensions[b] || base.weights[b] - base.weights[a],
  );
  const candidates: ReplacementCandidate[] = [];

  for (const target of replacementTargets(selection)) {
    const replacements = bundle.items.filter(
      (item) =>
        item.slot === target.slot &&
        !selected.has(item.id) &&
        (!ownedItemIds || ownedItemIds.size === 0 || ownedItemIds.has(item.id)),
    );
    for (const item of replacements) {
      const nextSelection = replaceAt(selection, target.slot, item.id, target.index);
      const next = evaluateCore(nextSelection, context, bundle);
      if (next.finalScore === null || next.finalScore <= base.finalScore) continue;
      const improved = deficits.find((dimension) => next.dimensions[dimension] > base.dimensions[dimension]);
      candidates.push({
        slot: target.slot,
        index: target.index,
        fromItemId: target.itemId,
        toItemId: item.id,
        beforeScore: base.finalScore,
        afterScore: next.finalScore,
        delta: next.finalScore - base.finalScore,
        reason: improved ? `补强${DIMENSION_LABELS[improved]}：${base.dimensions[improved]} → ${next.dimensions[improved]}` : "提升场景适配度",
      });
    }
  }

  const usedSlots = new Set<string>();
  return candidates
    .sort((a, b) => b.delta - a.delta || b.afterScore - a.afterScore)
    .filter((candidate) => {
      const key = `${candidate.slot}-${candidate.index ?? "single"}`;
      if (usedSlots.has(key)) return false;
      usedSlots.add(key);
      return true;
    })
    .slice(0, 2);
};

export const evaluateLoadout = (
  selection: LoadoutSelection,
  context: CombatContext,
  bundle: CatalogBundle = defaultCatalog,
  ownedItemIds?: Set<string>,
): EvaluationResult => {
  const started = performance.now();
  const core = evaluateCore(selection, context, bundle);
  const replacements = buildReplacements(selection, context, core, bundle, ownedItemIds);
  return { ...core, replacements, durationMs: performance.now() - started };
};
