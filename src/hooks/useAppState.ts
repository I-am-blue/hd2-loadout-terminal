import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState } from "../types";
import { DEFAULT_STATE, loadState, saveState } from "../lib/storage";

export const useAppState = () => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    void loadState().then((loaded) => {
      stateRef.current = loaded;
      setState(loaded);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (!hydrated) return;
    const timer = window.setTimeout(() => void saveState(state), 120);
    return () => clearTimeout(timer);
  }, [hydrated, state]);

  const update = useCallback((recipe: (current: AppState) => AppState) => {
    setState((current) => recipe(current));
  }, []);

  return { state, setState: update, hydrated };
};
