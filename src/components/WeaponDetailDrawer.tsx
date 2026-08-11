import { useEffect, useRef } from "react";
import { BookOpen, Check, Database, LockKeyhole, X } from "lucide-react";
import { getWeaponDetail } from "../data/weaponDetails";
import type { CatalogItem } from "../types";
import { WeaponSchematic } from "./WeaponSchematic";

interface WeaponDetailDrawerProps {
  item: CatalogItem;
  owned: boolean;
  onClose: () => void;
  onToggleOwned: () => void;
}

export function WeaponDetailDrawer({ item, owned, onClose, onToggleOwned }: WeaponDetailDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const detail = getWeaponDetail(item.id);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="weapon-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="weapon-drawer" role="dialog" aria-modal="true" aria-labelledby="weapon-drawer-title">
        <header className="weapon-drawer-header">
          <div><span className="eyebrow">ARMORY DATA // LOCAL</span><h2 id="weapon-drawer-title">武器详情</h2></div>
          <div><span className="sample-chip">本地资料</span><button ref={closeButtonRef} className="weapon-drawer-close" onClick={onClose} aria-label="关闭武器详情"><X size={22} /></button></div>
        </header>

        <div className="weapon-drawer-scroll">
          <WeaponSchematic item={item} />

          <section className="weapon-identity">
            <div className="weapon-identity-heading"><div><h3>{item.nameZh}</h3><p>{item.nameEn}</p></div><span className={owned ? "owned" : "locked"}>{owned ? <Check size={14} /> : <LockKeyhole size={14} />}{owned ? "已解锁" : "未标记"}</span></div>
            <div className="weapon-tags">
              <span>{detail?.weaponType ?? item.category}</span>
              <span>{detail ? `${detail.penetration}甲穿透` : "穿透资料待核验"}</span>
              {detail?.firingModes.map((mode) => <span key={mode}>{mode}</span>)}
            </div>
          </section>

          {detail ? <>
            <section className="weapon-detail-section">
              <h4><Database size={15} />核心数据</h4>
              <div className="weapon-stat-grid">{detail.coreStats.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
            </section>
            <section className="weapon-detail-section">
              <h4>弹药与特性</h4>
              <div className="weapon-stat-list">{detail.secondaryStats.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
            </section>
            <section className="weapon-detail-section procurement-section">
              <h4>获取方式</h4><p>{detail.procurement}</p>
            </section>
            <section className="weapon-source-note">
              <BookOpen size={16} />
              <div><span>数据参考：<a href={detail.sourceUrl} target="_blank" rel="noreferrer">{detail.sourceLabel}</a></span><small>{detail.sourceRevision} · 数据随游戏更新</small></div>
            </section>
          </> : <section className="weapon-detail-pending">
            <Database size={22} /><div><strong>资料待核验</strong><p>此武器的 Wiki 参数尚未完成人工交叉核对。当前不展示推测数值，避免与游戏版本不一致。</p></div>
          </section>}
        </div>

        <footer className="weapon-drawer-footer">
          <button className={owned ? "secondary-button" : "primary-button"} onClick={onToggleOwned}>{owned ? <><Check size={17} />已解锁 · 取消标记</> : <><LockKeyhole size={17} />标记为已解锁</>}</button>
        </footer>
      </aside>
    </div>
  );
}
