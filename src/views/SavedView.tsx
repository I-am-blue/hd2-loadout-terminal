import { useMemo, useState } from "react";
import { Bookmark, Clipboard, Copy, Search, Trash2, Upload } from "lucide-react";
import { encodeShareCode } from "../lib/shareCode";
import type { AppState, CatalogBundle } from "../types";

type UpdateState = (recipe: (current: AppState) => AppState) => void;

export function SavedView({ catalog, state, updateState, onLoad }: { catalog: CatalogBundle; state: AppState; updateState: UpdateState; onLoad: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const itemIndex = useMemo(() => new Map(catalog.items.map((item) => [item.id, item])), [catalog]);
  const filtered = state.savedLoadouts.filter((loadout) => loadout.title.toLowerCase().includes(query.toLowerCase()));

  return <section className="collection-page">
    <div className="page-intro"><div><span className="eyebrow">LOCAL ARCHIVE</span><h2>我的收藏</h2><p>全部配装仅保存在当前设备，不会上传云端。</p></div><label className="search-box slim"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索配装代号…" /></label></div>
    {filtered.length ? <div className="saved-grid">{filtered.map((loadout) => {
      const faction = catalog.factions.find((item) => item.id === loadout.context.factionId);
      const names = [loadout.selection.primaryId, ...loadout.selection.stratagemIds].filter((id): id is string => Boolean(id)).map((id) => itemIndex.get(id)?.nameZh).filter(Boolean);
      return <article className="saved-card" key={loadout.id}><header><span className="saved-faction">{faction?.signal}</span><button className="icon-button danger" aria-label="删除" onClick={() => updateState((current) => ({ ...current, savedLoadouts: current.savedLoadouts.filter((item) => item.id !== loadout.id) }))}><Trash2 size={16} /></button></header><h3>{loadout.title}</h3><p>{faction?.nameZh} · 难度 {loadout.context.difficulty} · {catalog.missions.find((item) => item.id === loadout.context.missionId)?.nameZh}</p><div className="saved-items">{names.slice(0, 5).map((name) => <span key={name}>{name}</span>)}</div><footer><button className="secondary-button" onClick={async () => { await navigator.clipboard.writeText(encodeShareCode(loadout)); setNotice("分享码已复制"); }}><Copy size={15} />分享码</button><button className="primary-button" onClick={() => onLoad(loadout.id)}><Upload size={15} />载入配装</button></footer></article>;
    })}</div> : <div className="empty-state"><Bookmark /><strong>暂无收藏配装</strong><span>在配装评估页完成所有槽位后即可保存。</span></div>}
    {notice && <button className="toast" onClick={() => setNotice("")}><Clipboard size={15} />{notice}</button>}
  </section>;
}
