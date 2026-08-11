import {
  Backpack,
  Bomb,
  Crosshair,
  Gauge,
  PackageOpen,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import type { CatalogItem, ItemSlot } from "../types";

const slotIcons = {
  armor: Shield,
  primary: Crosshair,
  secondary: Swords,
  throwable: Bomb,
  stratagem: Zap,
  booster: Gauge,
} satisfies Record<ItemSlot, typeof Shield>;

export function ItemGlyph({ item, size = 22 }: { item?: CatalogItem; size?: number }) {
  if (!item) return <PackageOpen size={size} />;
  const Icon = item.tags.includes("backpack") ? Backpack : item.tags.includes("explosive") ? Bomb : item.tags.includes("laser") || item.tags.includes("arc") ? Sparkles : slotIcons[item.slot];
  return <Icon size={size} strokeWidth={1.7} />;
}
