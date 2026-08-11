import type { AiReport, AiSettings, CatalogBundle, CombatContext, EvaluationResult, LoadoutSelection } from "../types";
import { selectedIds } from "./scoring";

export const aiCacheKey = (
  selection: LoadoutSelection,
  context: CombatContext,
  dataVersion: string,
  model: string,
) => `${dataVersion}:${model}:${JSON.stringify(context)}:${selectedIds(selection).join(",")}`;

export const validateEndpoint = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("服务地址不是有效 URL。");
  }
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("仅允许 HTTPS 地址；本机 localhost 可使用 HTTP。");
  }
  return url.toString().replace(/\/$/, "");
};

export const saveAiKey = async (apiKey: string) => {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_ai_key", { apiKey });
  } else {
    sessionStorage.setItem("hd2-ai-key", apiKey);
  }
};

export const clearAiKey = async () => {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clear_ai_key");
  } else sessionStorage.removeItem("hd2-ai-key");
};

const sanitizeReport = (value: unknown, allowedReplacementIds: Set<string>): AiReport => {
  if (!value || typeof value !== "object") throw new Error("AI 返回内容结构无效。");
  const candidate = value as Record<string, unknown>;
  const strings = (field: string, max: number) =>
    Array.isArray(candidate[field])
      ? (candidate[field] as unknown[]).filter((entry): entry is string => typeof entry === "string").slice(0, max)
      : [];
  const replacements = Array.isArray(candidate.replacements)
    ? candidate.replacements
        .filter((entry): entry is { itemId: string; explanation: string } =>
          Boolean(entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).itemId === "string" && typeof (entry as Record<string, unknown>).explanation === "string"),
        )
        .filter((entry) => allowedReplacementIds.has(entry.itemId))
        .slice(0, 2)
    : [];
  if (typeof candidate.summary !== "string") throw new Error("AI 报告缺少摘要。");
  return { summary: candidate.summary.slice(0, 800), strengths: strings("strengths", 4), risks: strings("risks", 4), replacements };
};

export const generateAiReport = async (
  settings: AiSettings,
  selection: LoadoutSelection,
  context: CombatContext,
  evaluation: EvaluationResult,
  bundle: CatalogBundle,
  signal?: AbortSignal,
): Promise<AiReport> => {
  const baseUrl = validateEndpoint(settings.baseUrl);
  const itemIndex = new Map(bundle.items.map((item) => [item.id, item]));
  const allowedReplacementIds = new Set(evaluation.replacements.map((candidate) => candidate.toItemId));
  const payload = {
    baseUrl,
    model: settings.model,
    context,
    loadout: selectedIds(selection).map((id) => ({ id, name: itemIndex.get(id)?.nameZh, tags: itemIndex.get(id)?.tags })),
    evaluation: {
      finalScore: evaluation.finalScore,
      rawScore: evaluation.rawScore,
      scoreCap: evaluation.scoreCap,
      dimensions: evaluation.dimensions,
      warnings: evaluation.warnings,
      replacements: evaluation.replacements.map((candidate) => ({ itemId: candidate.toItemId, reason: candidate.reason, delta: candidate.delta })),
    },
  };

  let raw: unknown;
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    raw = await invoke("generate_ai_report", { request: payload });
  } else {
    const key = sessionStorage.getItem("hd2-ai-key");
    if (!key) throw new Error("请先保存 API Key。");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    signal?.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: settings.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: "你是战术配装解释器。只能解释给定规则结果，不得修改分数或发明替换候选。只返回 JSON：summary、strengths、risks、replacements[{itemId,explanation}]。" },
            { role: "user", content: JSON.stringify(payload) },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`AI 服务返回 ${response.status}。`);
      const body = await response.json();
      const content = body?.choices?.[0]?.message?.content;
      raw = typeof content === "string" ? JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) : content;
    } finally {
      clearTimeout(timer);
    }
  }
  return sanitizeReport(raw, allowedReplacementIds);
};
