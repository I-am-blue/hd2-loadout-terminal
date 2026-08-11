import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Download,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";
import { ItemGlyph } from "../components/ItemGlyph";
import { ItemPicker } from "../components/ItemPicker";
import { RadarChart } from "../components/RadarChart";
import { aiCacheKey, generateAiReport } from "../lib/ai";
import { evaluateLoadout, isCompleteSelection, selectedIds } from "../lib/scoring";
import { decodeShareCode, encodeShareCode } from "../lib/shareCode";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  type AiReport,
  type AppState,
  type CatalogBundle,
  type CatalogItem,
  type CombatContext,
  type ItemSlot,
  type Loadout,
  type LoadoutSelection,
} from "../types";

type UpdateState = (recipe: (current: AppState) => AppState) => void;

const slotLabels: Record<ItemSlot, string> = {
  armor: "护甲配置",
  primary: "主武器",
  secondary: "副武器",
  throwable: "投掷物",
  stratagem: "战略配备",
  booster: "强化",
};

const scoreLabel = (score: number | null) => {
  if (score === null) return "待评估";
  if (score >= 85) return "卓越适配";
  if (score >= 75) return "稳定可靠";
  if (score >= 65) return "可执行";
  if (score >= 50) return "风险偏高";
  return "建议重整";
};

export function BuilderView({
  catalog,
  state,
  updateState,
  title,
  setTitle,
  selection,
  setSelection,
  context,
  setContext,
  itemIndex,
}: {
  catalog: CatalogBundle;
  state: AppState;
  updateState: UpdateState;
  title: string;
  setTitle: (title: string) => void;
  selection: LoadoutSelection;
  setSelection: (selection: LoadoutSelection) => void;
  context: CombatContext;
  setContext: (context: CombatContext) => void;
  itemIndex: Map<string, CatalogItem>;
}) {
  const [picker, setPicker] = useState<{ slot: ItemSlot; index?: number } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareInput, setShareInput] = useState("");
  const [notice, setNotice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const ownedIds = useMemo(() => new Set(state.ownedItemIds), [state.ownedItemIds]);
  const evaluation = useMemo(
    () => evaluateLoadout(selection, context, catalog, state.inventoryEnabled ? ownedIds : undefined),
    [catalog, context, ownedIds, selection, state.inventoryEnabled],
  );
  const cacheKey = aiCacheKey(selection, context, catalog.dataVersion, state.ai.model);
  const aiReport = state.aiCache[cacheKey];

  const currentLoadout = (): Loadout => {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: title.trim() || "未命名配装",
      createdAt: now,
      updatedAt: now,
      dataVersion: catalog.dataVersion,
      selection,
      context,
    };
  };

  const chooseItem = (item: CatalogItem) => {
    if (!picker) return;
    const next = { ...selection, stratagemIds: [...selection.stratagemIds] };
    if (picker.slot === "stratagem") {
      if (picker.index === undefined) next.stratagemIds.push(item.id);
      else next.stratagemIds[picker.index] = item.id;
    } else if (picker.slot === "armor") next.armorId = item.id;
    else if (picker.slot === "primary") next.primaryId = item.id;
    else if (picker.slot === "secondary") next.secondaryId = item.id;
    else if (picker.slot === "throwable") next.throwableId = item.id;
    else if (picker.slot === "booster") next.boosterId = item.id;
    setSelection(next);
    setPicker(null);
  };

  const saveLoadout = () => {
    if (!isCompleteSelection(selection)) return setNotice("请先完成全部战斗槽位。");
    const loadout = currentLoadout();
    updateState((current) => ({ ...current, savedLoadouts: [loadout, ...current.savedLoadouts] }));
    setNotice("已保存到我的收藏。");
  };

  const applyReplacement = (slot: ItemSlot, toItemId: string, index?: number) => {
    const next = { ...selection, stratagemIds: [...selection.stratagemIds] };
    if (slot === "stratagem" && index !== undefined) next.stratagemIds[index] = toItemId;
    else if (slot === "armor") next.armorId = toItemId;
    else if (slot === "primary") next.primaryId = toItemId;
    else if (slot === "secondary") next.secondaryId = toItemId;
    else if (slot === "throwable") next.throwableId = toItemId;
    else if (slot === "booster") next.boosterId = toItemId;
    setSelection(next);
  };

  const copyShare = async () => {
    if (!isCompleteSelection(selection)) return setNotice("请先完成全部战斗槽位。");
    await navigator.clipboard.writeText(encodeShareCode(currentLoadout()));
    setNotice("分享码已复制到剪贴板。");
  };

  const importShare = () => {
    try {
      const decoded = decodeShareCode(shareInput, catalog);
      setSelection(decoded.selection);
      setContext(decoded.context);
      setTitle(decoded.title);
      setShareOpen(false);
      setShareInput("");
      setNotice("分享码已导入。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败。");
    }
  };

  const requestAi = async (force = false) => {
    if (!evaluation.complete) return;
    if (aiReport && !force) return;
    setAiError("");
    setAiLoading(true);
    abortRef.current = new AbortController();
    try {
      const report = await generateAiReport(state.ai, selection, context, evaluation, catalog, abortRef.current.signal);
      updateState((current) => ({ ...current, aiCache: { ...current.aiCache, [cacheKey]: report } }));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : String(error));
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  };

  const slotCard = (slot: ItemSlot, id?: string, index?: number) => {
    const item = id ? itemIndex.get(id) : undefined;
    return (
      <button className={`slot-card ${item ? "filled" : "empty"}`} onClick={() => setPicker({ slot, index })}>
        <span className="slot-index">{slot === "stratagem" ? `S-${(index ?? 0) + 1}` : slotLabels[slot].slice(0, 2)}</span>
        <span className="slot-icon"><ItemGlyph item={item} /></span>
        <span className="slot-copy">
          <small>{slotLabels[slot]}</small>
          <strong>{item?.nameZh ?? "选择装备"}</strong>
          <span>{item?.nameEn ?? "EMPTY SLOT"}</span>
        </span>
        <ChevronRight size={17} />
      </button>
    );
  };

  return (
    <>
      <section className="context-panel">
        <div className="context-heading"><Target size={17} /><div><strong>作战参数</strong><span>评分权重将随目标环境重校准</span></div></div>
        <label><span>敌方阵营</span><select value={context.factionId} onChange={(event) => setContext({ ...context, factionId: event.target.value as CombatContext["factionId"] })}>{catalog.factions.map((faction) => <option key={faction.id} value={faction.id}>{faction.nameZh} / {faction.nameEn}</option>)}</select></label>
        <label><span>任务类型</span><select value={context.missionId} onChange={(event) => setContext({ ...context, missionId: event.target.value })}>{catalog.missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.nameZh}</option>)}</select></label>
        <label><span>难度等级</span><select value={context.difficulty} onChange={(event) => setContext({ ...context, difficulty: Number(event.target.value) })}>{catalog.difficulties.map((difficulty) => <option key={difficulty.level} value={difficulty.level}>{difficulty.level} · {difficulty.nameZh}</option>)}</select></label>
      </section>

      <div className="builder-grid">
        <section className="panel loadout-panel">
          <header className="panel-header">
            <div><span className="section-number">01</span><div><h2>战斗配置</h2><p>点击任意槽位替换装备</p></div></div>
            <div className="panel-actions">
              <button className="text-button" onClick={() => setSelection({ stratagemIds: [] })}><RotateCcw size={15} />清空</button>
              <button className="text-button" onClick={() => setShareOpen(true)}><Download size={15} />导入</button>
            </div>
          </header>
          <div className="title-row"><label>配装代号<input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label><span>{selectedIds(selection).length}/9 槽已配置</span></div>
          <div className="slot-grid core-slots">
            {slotCard("armor", selection.armorId)}
            {slotCard("primary", selection.primaryId)}
            {slotCard("secondary", selection.secondaryId)}
            {slotCard("throwable", selection.throwableId)}
            {slotCard("booster", selection.boosterId)}
          </div>
          <div className="subsection-label"><span>STRATAGEM ARRAY</span><span>4 个不可重复项目</span></div>
          <div className="slot-grid stratagem-slots">
            {[0, 1, 2, 3].map((index) => slotCard("stratagem", selection.stratagemIds[index], index))}
          </div>
          <footer className="loadout-footer">
            <button className="secondary-button" onClick={saveLoadout}><BookmarkPlus size={17} />保存收藏</button>
            <button className="primary-button" onClick={copyShare}><Share2 size={17} />复制分享码</button>
          </footer>
        </section>

        <section className="panel analysis-panel">
          <header className="panel-header">
            <div><span className="section-number">02</span><div><h2>场景适配评估</h2><p>本地确定性规则 · {evaluation.durationMs.toFixed(1)}ms</p></div></div>
            <span className={`completion-chip ${evaluation.complete ? "ready" : ""}`}>{evaluation.complete ? <CheckCircle2 size={14} /> : <Info size={14} />}{evaluation.complete ? "可执行" : "等待完整配装"}</span>
          </header>

          <div className="analysis-overview">
            <div className="score-block">
              <span className="score-kicker">SCENARIO FIT</span>
              <div className="score-value">{evaluation.finalScore ?? "--"}<small>/100</small></div>
              <strong>{scoreLabel(evaluation.finalScore)}</strong>
              {evaluation.scoreCap && <span className="cap-chip">封顶 {evaluation.scoreCap}</span>}
            </div>
            <RadarChart values={evaluation.dimensions} critical={evaluation.criticalDimensions} />
          </div>

          <div className="dimension-bars">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension} className={`dimension-row ${evaluation.criticalDimensions.includes(dimension) ? "critical" : ""}`}>
                <span>{DIMENSION_LABELS[dimension]}{evaluation.criticalDimensions.includes(dimension) && <em>关键</em>}</span>
                <div><i style={{ width: `${evaluation.dimensions[dimension]}%` }} /></div>
                <strong>{evaluation.dimensions[dimension]}</strong>
              </div>
            ))}
          </div>

          {evaluation.warnings.length > 0 && (
            <div className="warning-stack">
              {evaluation.warnings.map((warning) => <div key={warning}><AlertTriangle size={15} /><span>{warning}</span></div>)}
            </div>
          )}

          {evaluation.ruleHits.length > 0 && (
            <div className="rule-hits"><span className="subsection-label">命中规则</span><div>{evaluation.ruleHits.map((hit) => <span key={hit.id} className={hit.type}>{hit.type === "synergy" ? "+" : hit.type === "conflict" ? "!" : "↓"} {hit.label}</span>)}</div></div>
          )}

          {evaluation.complete && (
            <div className="replacement-section">
              <div className="subsection-label"><span>本地替换建议</span><span>固定规则计算</span></div>
              {evaluation.replacements.length ? evaluation.replacements.map((candidate) => {
                const from = itemIndex.get(candidate.fromItemId);
                const to = itemIndex.get(candidate.toItemId);
                return <button key={`${candidate.fromItemId}-${candidate.toItemId}`} className="replacement-card" onClick={() => applyReplacement(candidate.slot, candidate.toItemId, candidate.index)}><span className="replacement-gain">+{candidate.delta}</span><span><small>{from?.nameZh}</small><strong>{to?.nameZh}</strong><em>{candidate.reason}</em></span><ChevronRight /></button>;
              }) : <p className="muted-copy">当前规则未找到能直接提升总分的单槽替换。</p>}
            </div>
          )}
        </section>
      </div>

      <section className="panel ai-panel">
        <div className="ai-heading"><span className="ai-icon"><BrainCircuit /></span><div><span className="eyebrow">OPTIONAL BYOK ANALYSIS</span><h2>AI 战术报告</h2><p>AI 只解释本地规则结果，不能修改评分或发明替换候选。</p></div></div>
        {!evaluation.complete ? <div className="ai-placeholder"><Info size={17} />完成全部槽位后可生成报告</div> : !state.ai.hasApiKey ? <div className="ai-placeholder"><Sparkles size={17} />请先在“设置 / 关于”中保存 OpenAI 兼容 API Key</div> : aiLoading ? <div className="ai-placeholder"><LoaderCircle className="spin" size={18} />正在生成一次性战术报告…<button onClick={() => abortRef.current?.abort()}>取消</button></div> : aiReport ? <AiReportView report={aiReport} itemIndex={itemIndex} onRefresh={() => requestAi(true)} /> : <button className="ai-generate" onClick={() => requestAi()}><BrainCircuit size={19} />生成战术报告<span>使用 {state.ai.model}</span></button>}
        {aiError && <div className="inline-error"><AlertTriangle size={15} />{aiError}</div>}
      </section>

      {notice && <button className="toast" onClick={() => setNotice("")}><CheckCircle2 size={16} />{notice}<X size={14} /></button>}
      {picker && <ItemPicker bundle={catalog} slot={picker.slot} selectedIds={new Set(selectedIds(selection))} ownedIds={ownedIds} inventoryEnabled={state.inventoryEnabled} onSelect={chooseItem} onClose={() => setPicker(null)} />}
      {shareOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShareOpen(false)}>
          <section className="share-modal" role="dialog" aria-modal="true"><header><div><span className="eyebrow">IMPORT LOADOUT</span><h2>导入分享码</h2></div><button className="icon-button" onClick={() => setShareOpen(false)}><X /></button></header><textarea value={shareInput} onChange={(event) => setShareInput(event.target.value)} placeholder="粘贴 HD2T1.… 分享码" /><div className="share-actions"><button className="secondary-button" onClick={async () => setShareInput(await navigator.clipboard.readText())}><Clipboard size={16} />从剪贴板粘贴</button><button className="primary-button" disabled={!shareInput.trim()} onClick={importShare}><Upload size={16} />校验并导入</button></div></section>
        </div>
      )}
    </>
  );
}

function AiReportView({ report, itemIndex, onRefresh }: { report: AiReport; itemIndex: Map<string, CatalogItem>; onRefresh: () => void }) {
  return <div className="ai-report"><div className="ai-summary"><p>{report.summary}</p><button className="icon-button" onClick={onRefresh} aria-label="重新生成"><RefreshCw size={16} /></button></div><div className="ai-columns"><div><h3>优势确认</h3>{report.strengths.map((item) => <p key={item}><CheckCircle2 size={14} />{item}</p>)}</div><div><h3>风险提示</h3>{report.risks.map((item) => <p key={item}><AlertTriangle size={14} />{item}</p>)}</div><div><h3>替换路线</h3>{report.replacements.map((item) => <p key={item.itemId}><ChevronRight size={14} /><span><strong>{itemIndex.get(item.itemId)?.nameZh ?? item.itemId}</strong>{item.explanation}</span></p>)}</div></div></div>;
}
