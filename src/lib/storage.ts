import type { AppState } from "../types";

const STORE_KEY = "state";
const STORE_FILE = "hd2-terminal-state.json";

export const DEFAULT_STATE: AppState = {
  savedLoadouts: [],
  ownedItemIds: [],
  inventoryEnabled: false,
  ai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", hasApiKey: false },
  aiCache: {},
  uiScale: "medium",
};

const runningInTauri = () => "__TAURI_INTERNALS__" in window;

export const loadState = async (): Promise<AppState> => {
  try {
    if (runningInTauri()) {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
      const value = await store.get<AppState>(STORE_KEY);
      return value ? { ...DEFAULT_STATE, ...value, ai: { ...DEFAULT_STATE.ai, ...value.ai } } : DEFAULT_STATE;
    }
    const value = localStorage.getItem(STORE_KEY);
    return value ? { ...DEFAULT_STATE, ...JSON.parse(value) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveState = async (state: AppState) => {
  const safeState = { ...state, ai: { ...state.ai, hasApiKey: state.ai.hasApiKey } };
  if (runningInTauri()) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
    await store.set(STORE_KEY, safeState);
    await store.save();
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(safeState));
};
