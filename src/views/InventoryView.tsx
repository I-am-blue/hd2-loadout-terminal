import { useMemo, useState } from "react";
import { Check, Info, LockKeyhole, PackageCheck, Search } from "lucide-react";
import { ItemGlyph } from "../components/ItemGlyph";
import { WeaponDetailDrawer } from "../components/WeaponDetailDrawer";
import { getStratagemGroup, getStratagemGroupMeta, STRATAGEM_GROUPS, type StratagemGroupId } from "../lib/stratagemGroups";
import type { AppState, CatalogBundle, CatalogItem, ItemSlot } from "../types";

type UpdateState = (recipe: (current: AppState) => AppState) => void;

const filters: { id: ItemSlot; label: string }[] = [
  { id: "armor", label: "护甲" }, { id: "primary", label: "主武器" },
  { id: "secondary", label: "副武器" }, { id: "throwable", label: "手雷" },
  { id: "stratagem", label: "战备" }, { id: "booster", label: "被动" },
];

export function InventoryView({ catalog, state, updateState }: { catalog: CatalogBundle; state: AppState; updateState: UpdateState }) {
  const [slot, setSlot] = useState<ItemSlot>("armor");
  const [stratagemGroup, setStratagemGroup] = useState<"all" | StratagemGroupId>("all");
  const [query, setQuery] = useState("");
  const [detailItem, setDetailItem] = useState<CatalogItem>();
  const owned = useMemo(() => new Set(state.ownedItemIds), [state.ownedItemIds]);
  const visible = catalog.items.filter((item) => item.slot === slot && (slot !== "stratagem" || stratagemGroup === "all" || getStratagemGroup(item) === stratagemGroup) && [item.nameZh, item.nameEn, ...item.aliases].join(" ").toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string) => updateState((current) => {
    const ids = new Set(current.ownedItemIds);
    ids.has(id) ? ids.delete(id) : ids.add(id);
    return { ...current, ownedItemIds: [...ids] };
  });

  return <section className="inventory-page">
    <div className="page-intro"><div><span className="eyebrow">PERSONAL ARMORY</span><h2>本地装备库</h2><p>标记已解锁条目后，选择器和替换建议可以优先使用你的现有装备。</p></div><label className="toggle-card"><input type="checkbox" checked={state.inventoryEnabled} onChange={(event) => updateState((current) => ({ ...current, inventoryEnabled: event.target.checked }))} /><span><strong>启用装备库筛选</strong><small>{owned.size} / {catalog.items.length} 已解锁</small></span><i /></label></div>
    <div className="inventory-toolbar"><div className="segmented inventory-categories" aria-label="装备栏目">{filters.map((filter) => <button key={filter.id} className={slot === filter.id ? "active" : ""} onClick={() => { setSlot(filter.id); setStratagemGroup("all"); }}>{filter.label}</button>)}</div><label className="search-box slim"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索装备…" /></label></div>
    {slot === "stratagem" && <div className="inventory-stratagem-groups" aria-label="战备分组"><button className={stratagemGroup === "all" ? "active" : ""} onClick={() => setStratagemGroup("all")}>全部战备</button>{STRATAGEM_GROUPS.map((group) => <button key={group.id} className={`${group.id} ${stratagemGroup === group.id ? "active" : ""}`} title={group.description} onClick={() => setStratagemGroup(group.id)}><strong>{group.label}</strong><small>{group.description}</small></button>)}</div>}
    <div className="inventory-summary"><PackageCheck size={16} /><span>当前视图 {visible.filter((item) => owned.has(item.id)).length} 项已解锁</span><button onClick={() => updateState((current) => ({ ...current, ownedItemIds: visible.map((item) => item.id) }))}>全部标记</button><button onClick={() => updateState((current) => ({ ...current, ownedItemIds: current.ownedItemIds.filter((id) => !visible.some((item) => item.id === id)) }))}>清除当前</button></div>
    <div className="inventory-list">{visible.map((item) => <article key={item.id} className={`inventory-item ${owned.has(item.id) ? "owned" : ""}`}>
      <button className="inventory-item-toggle" onClick={() => toggle(item.id)} aria-label={`${owned.has(item.id) ? "取消" : "标记"}${item.nameZh}已解锁`}>
        <span className="inventory-glyph"><ItemGlyph item={item} /></span>
        <span className="inventory-item-copy"><strong>{item.nameZh}</strong><small>{item.nameEn}</small><em className={item.slot === "stratagem" ? `group-${getStratagemGroup(item)}` : ""}>{item.slot === "stratagem" ? getStratagemGroupMeta(item).label : item.category}</em></span>
        <i>{owned.has(item.id) ? <Check size={15} /> : <LockKeyhole size={14} />}{owned.has(item.id) ? "已解锁" : "未标记"}</i>
      </button>
      {(item.slot === "primary" || item.slot === "secondary") && <button className="inventory-detail-button" onClick={() => setDetailItem(item)}><Info size={14} />详情</button>}
    </article>)}</div>
    {detailItem && <WeaponDetailDrawer item={detailItem} owned={owned.has(detailItem.id)} onClose={() => setDetailItem(undefined)} onToggleOwned={() => toggle(detailItem.id)} />}
  </section>;
}
