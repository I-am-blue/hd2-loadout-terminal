import { z } from "zod";
import { catalog as bundledCatalog } from "../data/catalog";
import type { CatalogBundle } from "../types";

const dimensionMap = z.object({
  horde: z.number().min(0).max(100),
  medium: z.number().min(0).max(100),
  heavy: z.number().min(0).max(100),
  burst: z.number().min(0).max(100),
  control: z.number().min(0).max(100),
  survival: z.number().min(0).max(100),
  sustain: z.number().min(0).max(100),
  utility: z.number().min(0).max(100),
});

const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1).max(80),
  releasedAt: z.string(),
  items: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    slot: z.enum(["armor", "primary", "secondary", "throwable", "stratagem", "booster"]),
    nameZh: z.string().min(1),
    nameEn: z.string().min(1),
    aliases: z.array(z.string()),
    category: z.string(),
    roles: z.array(z.string()),
    tags: z.array(z.string()),
    description: z.string(),
    contributions: dimensionMap,
    contextModifiers: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  })).min(1),
  factions: z.array(z.unknown()).min(1),
  missions: z.array(z.unknown()).min(1),
  difficulties: z.array(z.unknown()).length(10),
  rules: z.array(z.unknown()),
  sources: z.array(z.unknown()),
});

export const validateCatalog = (value: unknown): CatalogBundle => {
  const parsed = catalogSchema.parse(value) as unknown as CatalogBundle;
  const ids = new Set(parsed.items.map((item) => item.id));
  if (ids.size !== parsed.items.length) throw new Error("在线目录包含重复装备 ID。");
  return parsed;
};

export const loadCatalog = async (): Promise<CatalogBundle> => {
  if (!("__TAURI_INTERNALS__" in window)) return bundledCatalog;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const content = await invoke<string | null>("load_catalog_override");
    return content ? validateCatalog(JSON.parse(content)) : bundledCatalog;
  } catch {
    return bundledCatalog;
  }
};
