import { useMemo, useState } from "react";
import { Check, Filter, LockKeyhole, Search, X } from "lucide-react";
import { getStratagemGroup, STRATAGEM_GROUPS, type StratagemGroupId } from "../lib/stratagemGroups";
import type { CatalogBundle, CatalogItem, ItemSlot } from "../types";
import { ItemGlyph } from "./ItemGlyph";

const slotNames: Record<ItemSlot, string> = {
  armor: "护甲配置",
  primary: "主武器",
  secondary: "副武器",
  throwable: "手雷",
  stratagem: "战备",
  booster: "被动",
};

export function ItemPicker({
  bundle,
  slot,
  selectedIds,
  ownedIds,
  inventoryEnabled,
  onSelect,
  onClose,
}: {
  bundle: CatalogBundle;
  slot: ItemSlot;
  selectedIds: Set<string>;
  ownedIds: Set<string>;
  inventoryEnabled: boolean;
  onSelect: (item: CatalogItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(inventoryEnabled);
  const [role, setRole] = useState("all");
  const [stratagemGroup, setStratagemGroup] = useState<"all" | StratagemGroupId>("all");
  const allItems = useMemo(() => bundle.items.filter((item) => item.slot === slot), [bundle, slot]);
  const roles = useMemo(() => [...new Set(allItems.flatMap((item) => item.roles))].slice(0, 16), [allItems]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return allItems.filter((item) => {
      const searchable = [item.nameZh, item.nameEn, ...item.aliases, ...item.tags].join(" ").toLocaleLowerCase();
      const matchesGroup = slot !== "stratagem" || stratagemGroup === "all" || getStratagemGroup(item) === stratagemGroup;
      return (!needle || searchable.includes(needle)) && matchesGroup && (role === "all" || item.roles.includes(role)) && (!ownedOnly || ownedIds.has(item.id));
    });
  }, [allItems, ownedIds, ownedOnly, query, role, slot, stratagemGroup]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="picker-modal" role="dialog" aria-modal="true" aria-label={`选择${slotNames[slot]}`}>
        <header className="picker-header">
          <div><span className="eyebrow">LOADOUT CATALOG</span><h2>选择{slotNames[slot]}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button>
        </header>
        <div className="picker-tools">
          <label className="search-box"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索中文、英文或别名…" /></label>
          <label className={`owned-filter ${ownedOnly ? "active" : ""}`}><input type="checkbox" checked={ownedOnly} onChange={(event) => setOwnedOnly(event.target.checked)} /><LockKeyhole size={15} />仅已解锁</label>
        </div>
        {slot === "stratagem" && (
          <div className="stratagem-group-row" aria-label="战备分组"><Filter size={14} /><button className={stratagemGroup === "all" ? "active" : ""} onClick={() => setStratagemGroup("all")}>全部战备</button>{STRATAGEM_GROUPS.map((group) => <button key={group.id} className={`${group.id} ${stratagemGroup === group.id ? "active" : ""}`} title={group.description} onClick={() => setStratagemGroup(group.id)}>{group.label}</button>)}</div>
        )}
        {slot !== "stratagem" && roles.length > 0 && (
          <div className="role-row"><Filter size={14} /><button className={role === "all" ? "active" : ""} onClick={() => setRole("all")}>全部</button>{roles.map((value) => <button key={value} className={role === value ? "active" : ""} onClick={() => setRole(value)}>{value}</button>)}</div>
        )}
        <div className="picker-count">找到 {filtered.length} / {allItems.length} 项</div>
        <div className="picker-grid">
          {filtered.map((item) => {
            const selected = selectedIds.has(item.id);
            const locked = inventoryEnabled && !ownedIds.has(item.id);
            return (
              <button key={item.id} className={`catalog-card ${selected ? "selected" : ""}`} disabled={slot === "stratagem" && selected} onClick={() => onSelect(item)}>
                <span className="catalog-icon"><ItemGlyph item={item} /></span>
                <span className="catalog-copy"><strong>{item.nameZh}</strong><small>{item.nameEn}</small><span>{item.tags.slice(2, 5).join(" · ") || item.category}</span></span>
                {selected ? <Check className="catalog-state" size={18} /> : locked ? <LockKeyhole className="catalog-state locked" size={15} /> : null}
              </button>
            );
          })}
          {!filtered.length && <div className="empty-state compact"><Search /><strong>没有匹配条目</strong><span>调整搜索词或解锁筛选后重试。</span></div>}
        </div>
      </section>
    </div>
  );
}
