import type { UiScale } from "../types";

export const UI_SCALE_OPTIONS: ReadonlyArray<{ id: UiScale; label: string; factor: number }> = [
  { id: "extra-small", label: "最小", factor: 0.8 },
  { id: "small", label: "小", factor: 0.9 },
  { id: "medium", label: "中", factor: 1 },
  { id: "large", label: "大", factor: 1.1 },
  { id: "extra-large", label: "最大", factor: 1.2 },
];

export const getUiScaleFactor = (size: UiScale) =>
  UI_SCALE_OPTIONS.find((option) => option.id === size)?.factor ?? 1;

export const applyUiScale = async (size: UiScale) => {
  const factor = getUiScaleFactor(size);
  document.documentElement.dataset.uiScale = size;

  if ("__TAURI_INTERNALS__" in window) {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    await getCurrentWebview().setZoom(factor);
    document.body.style.removeProperty("zoom");
    return;
  }

  // 浏览器预览没有原生 WebView 缩放，使用 CSS zoom 保持五档设置可预览。
  document.body.style.setProperty("zoom", String(factor));
};
