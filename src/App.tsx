import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Boxes,
  ChevronRight,
  Crosshair,
  Database,
  Radio,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { catalog as bundledCatalog } from "./data/catalog";
import { loadCatalog } from "./lib/catalogLoader";
import { useAppState } from "./hooks/useAppState";
import type { CombatContext, LoadoutSelection } from "./types";
import { BuilderView } from "./views/BuilderView";
import { SavedView } from "./views/SavedView";
import { InventoryView } from "./views/InventoryView";
import { SettingsView } from "./views/SettingsView";

export type PageId = "builder" | "saved" | "inventory" | "settings";

const initialSelection: LoadoutSelection = {
  armorId: "armor-engineering-kit",
  primaryId: "primary-ar-23-liberator",
  secondaryId: "secondary-p-19-redeemer",
  throwableId: "throwable-g-23-stun",
  stratagemIds: [
    "stratagem-eagle-airstrike",
    "stratagem-orbital-railcannon-strike",
    "stratagem-machine-gun",
    "stratagem-supply-pack",
  ],
  boosterId: "booster-stamina-enhancement",
};

const initialContext: CombatContext = {
  factionId: "automatons",
  difficulty: 8,
  missionId: "operations",
};

const navItems = [
  { id: "builder" as const, label: "配装评估", icon: Crosshair },
  { id: "saved" as const, label: "我的收藏", icon: Bookmark },
  { id: "inventory" as const, label: "装备库", icon: Boxes },
  { id: "settings" as const, label: "设置 / 关于", icon: Settings },
];

export default function App() {
  const [page, setPage] = useState<PageId>("builder");
  const [catalog, setCatalog] = useState(bundledCatalog);
  const [selection, setSelection] = useState<LoadoutSelection>(initialSelection);
  const [context, setContext] = useState<CombatContext>(initialContext);
  const [title, setTitle] = useState("自动机快速反应组");
  const { state, setState, hydrated } = useAppState();

  useEffect(() => { void loadCatalog().then(setCatalog); }, []);

  useEffect(() => {
    if (!hydrated || !("__TAURI_INTERNALS__" in window)) return;
    const last = state.lastCatalogCheck ? Date.parse(state.lastCatalogCheck) : 0;
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    setState((current) => ({ ...current, lastCatalogCheck: new Date().toISOString() }));
    void import("@tauri-apps/api/core").then(({ invoke }) => invoke("check_catalog_update").catch(() => undefined));
  }, [hydrated, setState, state.lastCatalogCheck]);

  const itemIndex = useMemo(() => new Map(catalog.items.map((item) => [item.id, item])), []);

  const loadSaved = (id: string) => {
    const loadout = state.savedLoadouts.find((candidate) => candidate.id === id);
    if (!loadout) return;
    setSelection(loadout.selection);
    setContext(loadout.context);
    setTitle(loadout.title);
    setPage("builder");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="HD2 战术配装终端">
          <div className="brand-emblem"><ShieldCheck size={23} /></div>
          <div><strong>HD2</strong><span>战术终端</span></div>
        </div>

        <nav aria-label="主导航">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>
              <Icon size={18} /><span>{label}</span>{page === id && <ChevronRight size={15} className="nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="status-line"><Radio size={14} /><span>离线核心就绪</span></div>
          <div className="status-detail">DATA {catalog.dataVersion}</div>
          <div className="status-detail">{catalog.items.length} 个战术条目</div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">SUPER EARTH // UNOFFICIAL FIELD SYSTEM</div>
            <h1>{navItems.find((item) => item.id === page)?.label}</h1>
          </div>
          <div className="topbar-meta">
            <span className="live-dot" />本地规则引擎
            <span className="divider" />
            <Database size={14} /> {catalog.dataVersion}
          </div>
        </header>

        <div className={`page-content ${!hydrated ? "loading" : ""}`}>
          {page === "builder" && (
            <BuilderView
              catalog={catalog}
              state={state}
              updateState={setState}
              title={title}
              setTitle={setTitle}
              selection={selection}
              setSelection={setSelection}
              context={context}
              setContext={setContext}
              itemIndex={itemIndex}
            />
          )}
          {page === "saved" && <SavedView catalog={catalog} state={state} updateState={setState} onLoad={loadSaved} />}
          {page === "inventory" && <InventoryView catalog={catalog} state={state} updateState={setState} />}
          {page === "settings" && <SettingsView catalog={catalog} state={state} updateState={setState} />}
        </div>
      </main>
    </div>
  );
}
