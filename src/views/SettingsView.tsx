import { useState } from "react";
import { AlertTriangle, Check, ExternalLink, FileDown, KeyRound, RefreshCw, ShieldCheck, Trash2, Type } from "lucide-react";
import { clearAiKey, saveAiKey, validateEndpoint } from "../lib/ai";
import { UI_SCALE_OPTIONS } from "../lib/uiScale";
import type { AppState, CatalogBundle } from "../types";

type UpdateState = (recipe: (current: AppState) => AppState) => void;

export function SettingsView({ catalog, state, updateState }: { catalog: CatalogBundle; state: AppState; updateState: UpdateState }) {
  const [baseUrl, setBaseUrl] = useState(state.ai.baseUrl);
  const [model, setModel] = useState(state.ai.model);
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const saveAi = async () => {
    setBusy(true);
    try {
      const safeUrl = validateEndpoint(baseUrl);
      if (apiKey.trim()) await saveAiKey(apiKey.trim());
      updateState((current) => ({ ...current, ai: { baseUrl: safeUrl, model: model.trim(), hasApiKey: current.ai.hasApiKey || Boolean(apiKey.trim()) } }));
      setApiKey("");
      setNotice("AI 配置已安全保存。");
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  const removeKey = async () => {
    await clearAiKey();
    updateState((current) => ({ ...current, ai: { ...current.ai, hasApiKey: false }, aiCache: {} }));
    setNotice("API Key 与本地 AI 缓存已清除。");
  };

  const exportLog = async () => {
    try {
      if (!("__TAURI_INTERNALS__" in window)) return setNotice("浏览器预览不生成桌面诊断日志。");
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const targetPath = await save({ defaultPath: "hd2-terminal-diagnostics.txt", filters: [{ name: "Text", extensions: ["txt"] }] });
      if (targetPath) await invoke("export_diagnostic_log", { targetPath });
      if (targetPath) setNotice("脱敏诊断日志已导出。");
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };

  const checkUpdates = async () => {
    if (!("__TAURI_INTERNALS__" in window)) return setNotice("浏览器预览中未启用更新检查。");
    setBusy(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("check_catalog_update");
      setNotice(result);
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  const checkAppUpdate = async () => {
    if (!("__TAURI_INTERNALS__" in window)) return setNotice("浏览器预览中未启用程序更新。");
    setBusy(true);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) return setNotice("当前已是最新程序版本。");
      const accepted = window.confirm(`发现版本 ${update.version}。是否下载并安装？应用只会在你确认后更新。`);
      if (!accepted) return setNotice("已取消程序更新。");
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) { setNotice(error instanceof Error ? error.message : "程序更新检查失败。"); }
    finally { setBusy(false); }
  };

  return <section className="settings-page">
    <div className="settings-grid">
      <section className="settings-card"><header><span><KeyRound /></span><div><span className="eyebrow">BYOK PROVIDER</span><h2>AI 接口</h2></div></header><p className="settings-copy">API Key 在桌面版中只写入 Windows Credential Manager。AI 只能解释本地评分，不拥有改分权限。</p><div className="form-stack"><label><span>OpenAI 兼容服务地址</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" /></label><label><span>模型名</span><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4.1-mini" /></label><label><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={state.ai.hasApiKey ? "已安全保存；留空则不更改" : "sk-…"} autoComplete="off" /></label></div><div className="settings-actions"><button className="primary-button" disabled={busy || !model.trim()} onClick={saveAi}><Check size={16} />保存配置</button>{state.ai.hasApiKey && <button className="danger-button" onClick={removeKey}><Trash2 size={16} />移除 Key</button>}</div></section>

      <section className="settings-card"><header><span><RefreshCw /></span><div><span className="eyebrow">RELEASE CHANNEL</span><h2>更新与诊断</h2></div></header><div className="data-status"><div><strong>目录版本</strong><span>{catalog.dataVersion}</span></div><div><strong>模式版本</strong><span>Schema {catalog.schemaVersion}</span></div><div><strong>战术条目</strong><span>{catalog.items.length}</span></div></div><p className="settings-copy">数据更新会校验签名与摘要后原子替换，并保留上一有效版本。应用安装包只提示更新，不会静默安装。</p><div className="settings-actions"><button className="secondary-button" disabled={busy} onClick={checkUpdates}><RefreshCw size={16} />检查数据</button><button className="secondary-button" disabled={busy} onClick={checkAppUpdate}><RefreshCw size={16} />检查程序</button><button className="secondary-button" onClick={exportLog}><FileDown size={16} />导出日志</button></div><div className="privacy-note"><ShieldCheck size={18} /><span><strong>零遥测</strong>本应用不会自动上传使用统计、配装、Key 或诊断信息。</span></div></section>

      <section className="settings-card display-card"><header><span><Type /></span><div><span className="eyebrow">DISPLAY ACCESSIBILITY</span><h2>字体大小</h2></div></header><p className="settings-copy">选择全局界面字体大小。当前“中”为原始默认大小，修改后立即生效并自动保存在本机。</p><div className="font-size-picker" role="radiogroup" aria-label="字体大小">{UI_SCALE_OPTIONS.map((option) => <button key={option.id} type="button" role="radio" aria-checked={state.uiScale === option.id} className={state.uiScale === option.id ? "active" : ""} onClick={() => updateState((current) => ({ ...current, uiScale: option.id }))}><span>{option.label}</span><small>{Math.round(option.factor * 100)}%</small></button>)}</div></section>

      <section className="settings-card about-card"><header><span><ShieldCheck /></span><div><span className="eyebrow">ABOUT THIS PROJECT</span><h2>关于 HD2 战术配装终端</h2></div></header><p>免费、开源、非商业的中文玩家工具。源代码采用 MIT 许可证；标准化数据、原创评分标签和第三方素材不包含在 MIT 授权范围内。</p><div className="disclaimer"><AlertTriangle size={18} /><span>本项目是非官方粉丝工具，与 Sony Interactive Entertainment、Arrowhead Game Studios 无关联。HELLDIVERS 相关商标与游戏内容归其权利人所有。</span></div><div className="source-list">{catalog.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.label}</strong><small>{source.note}</small></span><ExternalLink size={15} /></a>)}</div></section>
    </div>
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice}</button>}
  </section>;
}
