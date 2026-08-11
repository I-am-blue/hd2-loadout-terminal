import { useMemo, useState } from "react";
import { Check, LockKeyhole, PackageCheck, Search } from "lucide-react";
import { ItemGlyph } from "../components/ItemGlyph";
import type { AppState, CatalogBundle, ItemSlot } from "../types";

type UpdateState = (recipe: (current: AppState) => AppState) => void;

const filters: { id: "all" | ItemSlot; label: string }[] = [
  { id: "all", label: "全部" }, { id: "armor", label: "护甲" }, { id: "primary", label: "主武器" },
  { id: "secondary", label: "副武器" }, { id: "throwable", label: "投掷物" }, { id: "stratagem", label: "战略配备" }, { id: "booster", label: "强化" },
];

export function InventoryView({ catalog, state, updateState }: { catalog: CatalogBundle; state: AppState; updateState: UpdateState }) {
  const [slot, setSlot] = useState<"all" | ItemSlot>("all");
  const [query, setQuery] = useState("");
  const owned = useMemo(() => new Set(state.ownedItemIds), [state.ownedItemIds]);
  const visible = catalog.items.filter((item) => (slot === "all" || item.slot === slot) && [item.nameZh, item.nameEn, ...item.aliases].join(" ").toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string) => updateState((current) => {
    const ids = new Set(current.ownedItemIds);
    ids.has(id) ? ids.delete(id) : ids.add(id);
    return { ...current, ownedItemIds: [...ids] };
  });

  return <section className="inventory-page">
    <div className="page-intro"><div><span className="eyebrow">PERSONAL ARMORY</span><h2>本地装备库</h2><p>标记已解锁条目后，选择器和替换建议可以优先使用你的现有装备。</p></div><label className="toggle-card"><input type="checkbox" checked={state.inventoryEnabled} onChange={(event) => updateState((current) => ({ ...current, inventoryEnabled: event.target.checked }))} /><span><strong>启用装备库筛选</strong><small>{owned.size} / {catalog.items.length} 已解锁</small></span><i /></label></div>
    <div className="inventory-toolbar"><div className="segmented">{filters.map((filter) => <button key={filter.id} className={slot === filter.id ? "active" : ""} onClick={() => setSlot(filter.id)}>{filter.label}</button>)}</div><label className="search-box slim"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索装备…" /></label></div>
    <div className="inventory-summary"><PackageCheck size={16} /><span>当前视图 {visible.filter((item) => owned.has(item.id)).length} 项已解锁</span><button onClick={() => updateState((current) => ({ ...current, ownedItemIds: visible.map((item) => item.id) }))}>全部标记</button><button onClick={() => updateState((current) => ({ ...current, ownedItemIds: current.ownedItemIds.filter((id) => !visible.some((item) => item.id === id)) }))}>清除当前</button></div>
    <div className="inventory-list">{visible.map((item) => <button key={item.id} className={`inventory-item ${owned.has(item.id) ? "owned" : ""}`} onClick={() => toggle(item.id)}><span className="inventory-glyph"><ItemGlyph item={item} /></span><span><strong>{item.nameZh}</strong><small>{item.nameEn}</small></span><em>{item.category}</em><i>{owned.has(item.id) ? <Check size={15} /> : <LockKeyhole size={14} />}{owned.has(item.id) ? "已解锁" : "未标记"}</i></button>)}</div>
  </section>;
}
