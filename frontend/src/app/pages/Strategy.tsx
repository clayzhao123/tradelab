import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, CircleHelp, FlaskConical, Plus, Power, Search, Sparkles, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { useData } from "../contexts/DataContext";
import { useMascot } from "../contexts/MascotContext";
import {
  INDICATOR_CATALOG,
  INDICATOR_FAMILIES,
  INDICATOR_LABELS,
  type IndicatorDefinition,
  type IndicatorFamily,
} from "../constants/indicatorCatalog";
import { getIndicatorGuide } from "../constants/indicatorGuides";
import { IndicatorEducationPanel } from "../components/strategy/IndicatorEducationPanel";
import { api, ApiError, toUserErrorMessage, type AiFusionResult, type AiProviderConfig } from "../../shared/api/client";

const MAX_SELECTED = 8;

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeWeights(input: Record<string, number>): Record<string, number> {
  const ids = Object.keys(input);
  if (ids.length === 0) {
    return {};
  }
  const safe = ids.map((id) => ({ id, value: Math.max(0, input[id] ?? 0) }));
  const total = safe.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) {
    const equal = round2(100 / ids.length);
    const out = Object.fromEntries(ids.map((id) => [id, equal]));
    const current = Object.values(out).reduce((sum, value) => sum + value, 0);
    out[ids[ids.length - 1]] = round2((out[ids[ids.length - 1]] ?? 0) + (100 - current));
    return out;
  }
  const normalized = safe.map((row) => ({ id: row.id, value: round2((row.value / total) * 100) }));
  const normalizedTotal = normalized.reduce((sum, row) => sum + row.value, 0);
  normalized[normalized.length - 1].value = round2(normalized[normalized.length - 1].value + (100 - normalizedTotal));
  return Object.fromEntries(normalized.map((row) => [row.id, row.value]));
}

function addWithRebalance(current: Record<string, number>, nextId: string): Record<string, number> {
  const ids = Object.keys(current);
  if (ids.length === 0) {
    return { [nextId]: 100 };
  }
  // New indicators start at 0% so existing allocation is preserved.
  return normalizeWeights({ ...current, [nextId]: 0 });
}

function removeWithRebalance(current: Record<string, number>, removeId: string): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [id, value] of Object.entries(current)) {
    if (id !== removeId) {
      next[id] = value;
    }
  }
  return normalizeWeights(next);
}

function rebalanceAfterManualChange(current: Record<string, number>, targetId: string, value: number): Record<string, number> {
  if (!Object.hasOwn(current, targetId) || !Number.isFinite(value)) {
    return current;
  }
  const ids = Object.keys(current);
  if (ids.length <= 1) {
    return { [targetId]: 100 };
  }
  const target = clamp(value, 0, 100);
  const otherIds = ids.filter((id) => id !== targetId);
  const othersTotal = otherIds.reduce((sum, id) => sum + Math.max(0, current[id] ?? 0), 0);
  const remaining = Math.max(0, 100 - target);
  const next: Record<string, number> = { [targetId]: target };

  if (othersTotal <= 0) {
    const equal = remaining / otherIds.length;
    for (const id of otherIds) {
      next[id] = equal;
    }
  } else {
    for (const id of otherIds) {
      next[id] = (Math.max(0, current[id] ?? 0) / othersTotal) * remaining;
    }
  }

  return normalizeWeights(next);
}

function familyLabel(family: IndicatorFamily): string {
  const row = INDICATOR_FAMILIES.find((item) => item.value === family);
  return row?.label ?? family;
}

function parseFusionOrigin(params: Record<string, unknown>): "manual" | "ai_prompt" | "ai_selected" {
  const fusion = params.fusion;
  if (!fusion || typeof fusion !== "object" || Array.isArray(fusion)) {
    return "manual";
  }
  const origin = (fusion as Record<string, unknown>).origin;
  if (origin === "ai_prompt" || origin === "ai_selected") {
    return origin;
  }
  return "manual";
}

function fusionOriginLabel(origin: "manual" | "ai_prompt" | "ai_selected"): string {
  if (origin === "ai_prompt") return "AI Prompt";
  if (origin === "ai_selected") return "AI Enhanced";
  return "Manual";
}

export function Strategy() {
  const { strategies, runs, createStrategy, updateStrategy, deleteStrategy } = useData();
  const { setStrategyThinking } = useMascot();
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<IndicatorFamily | "all">("all");
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [customName, setCustomName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<string>(INDICATOR_CATALOG[0]?.id ?? "");
  const [aiConfig, setAiConfig] = useState<AiProviderConfig | null>(null);
  const [aiModelDraft, setAiModelDraft] = useState("MiniMax-M2.7");
  const [aiApiKeyDraft, setAiApiKeyDraft] = useState("");
  const [aiMode, setAiMode] = useState<"prompt" | "selected">("selected");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<AiFusionResult | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const selectedIndicators = useMemo(
    () => INDICATOR_CATALOG.filter((indicator) => Object.hasOwn(selectedWeights, indicator.id)),
    [selectedWeights],
  );

  const indicatorById = useMemo(
    () => new Map(INDICATOR_CATALOG.map((indicator) => [indicator.id, indicator])),
    [],
  );

  const indicatorGuideMap = useMemo(
    () =>
      Object.fromEntries(INDICATOR_CATALOG.map((indicator) => [indicator.id, getIndicatorGuide(indicator)])) as Record<
        string,
        ReturnType<typeof getIndicatorGuide>
      >,
    [],
  );

  const indicatorPoolForAi = useMemo(
    () =>
      INDICATOR_CATALOG.map(({ id, name, family, description, labels }) => ({
        id,
        name,
        family,
        description,
        labels,
      })),
    [],
  );

  const filteredIndicators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INDICATOR_CATALOG.filter((indicator) => {
      const familyOk = familyFilter === "all" || indicator.family === familyFilter;
      if (!familyOk) return false;
      const labelOk = labelFilters.every((label) => indicator.labels.includes(label));
      if (!labelOk) return false;
      if (!q) return true;
      return (
        indicator.name.toLowerCase().includes(q) ||
        indicator.description.toLowerCase().includes(q) ||
        indicator.id.toLowerCase().includes(q)
      );
    });
  }, [search, familyFilter, labelFilters]);

  const totalWeight = useMemo(
    () => round2(Object.values(selectedWeights).reduce((sum, value) => sum + value, 0)),
    [selectedWeights],
  );

  const activeGuideIndicator = useMemo(() => {
    const direct = INDICATOR_CATALOG.find((indicator) => indicator.id === activeGuideId);
    if (direct) {
      return direct;
    }
    return filteredIndicators[0] ?? INDICATOR_CATALOG[0] ?? null;
  }, [activeGuideId, filteredIndicators]);

  const preview = useMemo(() => {
    if (selectedIndicators.length < 2) {
      return null;
    }

    const weightedEdge =
      selectedIndicators.reduce((sum, indicator) => {
        const weight = selectedWeights[indicator.id] ?? 0;
        return sum + indicator.expectedEdge * (weight / 100);
      }, 0);
    const familyCount = new Set(selectedIndicators.map((indicator) => indicator.family)).size;
    const score = clamp(Math.round(42 + weightedEdge * 65 + familyCount * 3), 0, 99);

    const autoName = `${selectedIndicators[0].name}-${selectedIndicators[1].name} Weighted Fusion`;
    const components = selectedIndicators
      .map((indicator) => `${indicator.name}(${(selectedWeights[indicator.id] ?? 0).toFixed(2)}%)`)
      .join(" + ");

    return {
      name: customName.trim() || autoName,
      score,
      components,
      formula: "Signal(t) = Σ [weight_i * normalized_indicator_i(t)]，当 Signal > 0.22 做多，< -0.22 做空",
      logic:
        "融合信号基于各指标标准化输出的加权求和。权重越高的指标，对入场/离场决策贡献越大；通过多类别指标分散单一风格失效风险。",
    };
  }, [selectedIndicators, selectedWeights, customName]);

  const runningStrategyIds = useMemo(
    () => new Set(runs.filter((run) => run.status === "running").map((run) => run.strategyId)),
    [runs],
  );

  useEffect(() => {
    const hasDraft = selectedIndicators.length > 0 || customName.trim().length > 0;
    setStrategyThinking(isSaving || hasDraft);
    return () => setStrategyThinking(false);
  }, [isSaving, selectedIndicators.length, customName, setStrategyThinking]);

  useEffect(() => {
    let active = true;
    const loadAiConfig = async (): Promise<void> => {
      try {
        const config = await api.getAiConfig();
        if (!active) {
          return;
        }
        setAiConfig(config);
        setAiModelDraft(config.model);
      } catch {
        if (!active) {
          return;
        }
        setAiErrorMessage("无法加载 AI 配置，请稍后重试。");
      }
    };
    void loadAiConfig();
    return () => {
      active = false;
    };
  }, []);

  const toggleLabelFilter = (label: string): void => {
    setLabelFilters((prev) => (prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]));
  };

  const toggleIndicator = (indicator: IndicatorDefinition): void => {
    setActiveGuideId(indicator.id);
    setSelectedWeights((prev) => {
      const exists = Object.hasOwn(prev, indicator.id);
      if (exists) {
        return removeWithRebalance(prev, indicator.id);
      }
      if (Object.keys(prev).length >= MAX_SELECTED) {
        return prev;
      }
      return addWithRebalance(prev, indicator.id);
    });
  };

  const setIndicatorWeight = (indicatorId: string, value: number): void => {
    setSelectedWeights((prev) => rebalanceAfterManualChange(prev, indicatorId, value));
  };

  const handleSaveAiConfig = async (): Promise<void> => {
    setAiErrorMessage(null);
    setIsSavingAiConfig(true);
    try {
      const updated = await api.updateAiConfig({
        provider: "minimax",
        model: aiModelDraft.trim() || "MiniMax-M2.7",
        apiKey: aiApiKeyDraft.trim() || undefined,
      });
      setAiConfig(updated);
      setAiApiKeyDraft("");
    } catch (error) {
      setAiErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  const handleGenerateAiFusion = async (): Promise<void> => {
    setAiErrorMessage(null);
    setIsGeneratingAi(true);
    try {
      const selectedPayload = selectedIndicators.map((indicator) => ({
        id: indicator.id,
        name: indicator.name,
        family: indicator.family,
        labels: indicator.labels,
        weight: selectedWeights[indicator.id] ?? 0,
      }));
      const next = await api.generateAiFusion({
        mode: aiMode,
        prompt: aiMode === "prompt" ? aiPrompt : aiPrompt.trim() ? aiPrompt : undefined,
        selectedIndicators: aiMode === "selected" ? selectedPayload : undefined,
        indicatorPool: indicatorPoolForAi,
      });
      setAiResult(next);
    } catch (error) {
      setAiErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const applyAiResultToDraft = (): void => {
    if (!aiResult) {
      return;
    }
    const nextWeights: Record<string, number> = {};
    for (const row of aiResult.indicators) {
      if (indicatorById.has(row.id)) {
        nextWeights[row.id] = row.weight;
      }
    }
    if (Object.keys(nextWeights).length < 2) {
      setAiErrorMessage("AI 结果中的指标在当前指标池中不足 2 个，无法应用。");
      return;
    }
    setSelectedWeights(normalizeWeights(nextWeights));
    setCustomName(aiResult.strategyNameSuggestion);
  };

  const aiRadarData = useMemo(
    () =>
      aiResult
        ? [
            { key: "Return", value: aiResult.radar.returnPotential },
            { key: "Robust", value: aiResult.radar.robustness },
            { key: "Risk", value: aiResult.radar.riskControl },
            { key: "Explain", value: aiResult.radar.explainability },
            { key: "Fit", value: aiResult.radar.marketFit },
          ]
        : [],
    [aiResult],
  );

  const handleCreateStrategy = async (): Promise<void> => {
    if (!preview || selectedIndicators.length < 2 || Math.abs(totalWeight - 100) > 0.01) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      await createStrategy({
        name: preview.name,
        description: preview.logic,
        params: {
          timeframe: "15m",
          riskPct: 0.02,
          fusion: {
            method: "weighted_sum",
            origin: aiResult ? (aiMode === "prompt" ? "ai_prompt" : "ai_selected") : "manual",
            indicators: selectedIndicators.map((indicator) => ({
              id: indicator.id,
              name: indicator.name,
              family: indicator.family,
              labels: indicator.labels,
              weight: selectedWeights[indicator.id] ?? 0,
            })),
            weightsTotal: 100,
            decisionThreshold: {
              long: 0.22,
              short: -0.22,
            },
            ...(aiResult
              ? {
                  ai: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    totalScore: aiResult.totalScore,
                    radar: aiResult.radar,
                    introduction: aiResult.introduction,
                  },
                }
              : {}),
          },
        },
      });
      setSelectedWeights({});
      setCustomName("");
      setAiResult(null);
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStrategy = async (strategyId: string, isEnabled: boolean): Promise<void> => {
    setErrorMessage(null);
    try {
      await updateStrategy(strategyId, { isEnabled: !isEnabled });
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    }
  };

  const handleDeleteStrategy = async (strategyId: string): Promise<void> => {
    setErrorMessage(null);
    setDeletingId(strategyId);
    try {
      await deleteStrategy(strategyId);
    } catch (error) {
      if (error instanceof ApiError && error.code === "conflict.strategy_in_use") {
        setErrorMessage("该策略正在被运行中的 Bot 使用，请先在 Bot Runner 停止运行后再删除。");
      } else {
        setErrorMessage(toUserErrorMessage(error));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-[1400px] mx-auto overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-medium text-tx-primary mb-1">Indicator Fusion Lab</h1>
        <p className="text-[13px] text-tx-secondary">
          指标池扩展为多类别多标签，支持按标签检索，并按权重(总和100%)融合生成策略。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[520px] items-start">
        <div className="col-span-1 xl:col-span-6 min-h-0 flex flex-col bg-surface border border-border-subtle rounded-xl p-5 shadow-sm overflow-hidden self-start">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Indicator Universe</h2>
            <span className="text-[11px] text-tx-tertiary">
              {selectedIndicators.length}/{MAX_SELECTED} selected | weight {totalWeight.toFixed(2)}%
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 bg-elevated">
            <Search size={14} className="text-tx-tertiary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search indicator / id / description"
              className="w-full bg-transparent text-[13px] text-tx-primary outline-none"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {INDICATOR_FAMILIES.map((family) => (
              <button
                key={family.value}
                onClick={() => setFamilyFilter(family.value)}
                className={clsx(
                  "px-2 py-1 rounded border text-[11px]",
                  familyFilter === family.value
                    ? "bg-accent-bg border-accent text-accent"
                    : "bg-page border-border-subtle text-tx-secondary hover:text-tx-primary",
                )}
              >
                {family.label}
              </button>
            ))}
          </div>

          <div className="mb-4 max-h-[70px] overflow-y-auto pr-1 flex flex-wrap gap-1.5">
            {INDICATOR_LABELS.map((label) => (
              <button
                key={label}
                onClick={() => toggleLabelFilter(label)}
                className={clsx(
                  "px-2 py-1 rounded-full border text-[10px] font-medium",
                  labelFilters.includes(label)
                    ? "bg-up-bg border-up/40 text-up"
                    : "bg-page border-border-subtle text-tx-tertiary hover:text-tx-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="indicator-scrollbar h-[180px] xl:h-[210px] shrink-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2">
                {filteredIndicators.map((indicator) => {
                  const isSelected = Object.hasOwn(selectedWeights, indicator.id);
                  const isDisabled = !isSelected && selectedIndicators.length >= MAX_SELECTED;
                  const guide = indicatorGuideMap[indicator.id];
                  const isGuideActive = activeGuideIndicator?.id === indicator.id;
                  return (
                    <div
                      key={indicator.id}
                      className={clsx(
                        "w-full p-3 rounded-lg border transition-all duration-200",
                        isSelected
                          ? "bg-accent-bg border-accent text-accent shadow-sm"
                          : "bg-elevated border-border-subtle text-tx-secondary",
                        !isSelected && !isDisabled && "hover:border-border-strong",
                        isDisabled && "opacity-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => toggleIndicator(indicator)}
                          disabled={isDisabled}
                          className="flex-1 text-left disabled:cursor-not-allowed"
                        >
                          <div className={clsx("text-[13px] font-medium", isSelected ? "text-accent" : "text-tx-primary")}>{indicator.name}</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{indicator.description}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-border-subtle text-[10px] text-tx-tertiary">
                              {familyLabel(indicator.family)}
                            </span>
                            {indicator.labels.slice(0, 4).map((label) => (
                              <span key={`${indicator.id}-${label}`} className="px-1.5 py-0.5 rounded bg-page border border-border-subtle text-[10px] text-tx-tertiary">
                                {label}
                              </span>
                            ))}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveGuideId(indicator.id);
                              }}
                              className={clsx(
                                "h-6 w-6 rounded-full border flex items-center justify-center transition-colors",
                                isGuideActive
                                  ? "border-accent text-accent bg-accent-bg"
                                  : "border-border-subtle text-tx-tertiary hover:text-tx-primary hover:border-border-default",
                              )}
                              aria-label={`查看 ${indicator.name} 解释`}
                            >
                              <CircleHelp size={14} />
                            </button>
                            <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-[250px] rounded-md border border-border-subtle bg-page px-2.5 py-2 text-[11px] leading-relaxed text-tx-secondary shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                              {guide?.quickIntro}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleIndicator(indicator)}
                            disabled={isDisabled}
                            className="h-6 w-6 rounded-full border border-border-subtle flex items-center justify-center text-tx-tertiary hover:text-tx-primary hover:border-border-default disabled:cursor-not-allowed"
                            aria-label={isSelected ? `移除 ${indicator.name}` : `添加 ${indicator.name}`}
                          >
                            {isSelected ? <X size={15} /> : <Plus size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[360px] h-[58vh] max-h-[760px] border-t border-border-subtle pt-4 overflow-hidden flex flex-col">
              <div className="mb-2 flex items-center justify-between shrink-0">
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Indicator Explain</h3>
                <span className="text-[11px] text-tx-tertiary">悬停 `?` 看摘要，点击查看详细图文</span>
              </div>
              <div className="indicator-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                {activeGuideIndicator ? (
                  <IndicatorEducationPanel indicator={activeGuideIndicator} />
                ) : (
                  <div className="rounded-lg border border-border-subtle bg-elevated p-3 text-[12px] text-tx-tertiary">暂无可展示指标。</div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="col-span-1 xl:col-span-6 flex flex-col gap-4 self-start">
          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Fusion Weight Sliders</h2>
              <span className={clsx("text-[11px] font-mono", Math.abs(totalWeight - 100) <= 0.01 ? "text-up" : "text-down")}>
                Total {totalWeight.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] text-tx-tertiary mb-3">
              新增指标默认 0%。右侧拖动任一指标权重时，其余已选指标将自动联动，确保总和始终保持 100%。
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {selectedIndicators.map((indicator) => {
                const weight = selectedWeights[indicator.id] ?? 0;
                return (
                  <div key={indicator.id} className="rounded-lg border border-border-subtle bg-elevated p-2.5">
                    <div className="flex items-center justify-between gap-2 text-[12px] mb-2">
                      <span className="text-tx-primary font-medium">{indicator.name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={weight}
                          onChange={(event) => setIndicatorWeight(indicator.id, Number(event.target.value))}
                          className="w-20 bg-page border border-border-subtle rounded px-2 py-1 text-right text-[11px] text-tx-primary"
                        />
                        <span className="text-tx-tertiary text-[11px]">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={weight}
                      onChange={(event) => setIndicatorWeight(indicator.id, Number(event.target.value))}
                      className="w-full accent-[var(--base-color-accent)]"
                    />
                  </div>
                );
              })}
              {selectedIndicators.length === 0 && (
                <div className="text-[12px] text-tx-tertiary">先在左侧选择指标，再在这里拖动权重。</div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">AI Fusion</h2>
              <span className="text-[11px] text-tx-tertiary">Provider: minimax</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <input
                value={aiModelDraft}
                onChange={(event) => setAiModelDraft(event.target.value)}
                placeholder="Model"
                className="md:col-span-2 bg-elevated border border-border-subtle rounded px-3 py-2 text-[12px] text-tx-primary"
              />
              <input
                value={aiApiKeyDraft}
                onChange={(event) => setAiApiKeyDraft(event.target.value)}
                placeholder={aiConfig?.hasApiKey ? "API Key (leave empty to keep existing)" : "API Key"}
                className="bg-elevated border border-border-subtle rounded px-3 py-2 text-[12px] text-tx-primary"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3 min-w-0">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-[11px] text-tx-tertiary truncate">
                  当前配置: {aiConfig?.model ?? "MiniMax-M2.7"}
                </div>
                <div
                  className="text-[11px] text-tx-secondary font-mono truncate"
                  title={aiConfig?.hasApiKey ? "已保存密钥（仅显示尾号）" : undefined}
                >
                  Key {aiConfig?.apiKeyMasked ?? "Not set"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleSaveAiConfig();
                }}
                disabled={isSavingAiConfig}
                className="shrink-0 self-start px-2.5 py-1 rounded border border-border-subtle bg-elevated text-[11px] text-tx-secondary hover:text-tx-primary disabled:opacity-50"
              >
                {isSavingAiConfig ? "Saving..." : "Save Config"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <select
                value={aiMode}
                onChange={(event) => setAiMode(event.target.value as "prompt" | "selected")}
                className="bg-elevated border border-border-subtle rounded px-3 py-2 text-[12px] text-tx-primary"
              >
                <option value="selected">Selected Indicators</option>
                <option value="prompt">Prompt to Generate</option>
              </select>
              <input
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder={aiMode === "prompt" ? "Describe your strategy objective..." : "Prompt optional in selected mode"}
                className="md:col-span-2 bg-elevated border border-border-subtle rounded px-3 py-2 text-[12px] text-tx-primary"
              />
            </div>

            {aiMode === "selected" && selectedIndicators.length < 2 ? (
              <p className="text-[11px] text-tx-tertiary mb-2 leading-snug">
                当前为「已选指标」模式：请先在左侧勾选<strong className="text-tx-secondary">至少 2 个</strong>指标并分配权重后，再点击生成（与下方融合预览要求一致）。
              </p>
            ) : null}
            {aiMode === "prompt" && !aiPrompt.trim() ? (
              <p className="text-[11px] text-tx-tertiary mb-2 leading-snug">
                「Prompt」模式下请先在上面的输入框中填写策略目标，再点击生成。
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                void handleGenerateAiFusion();
              }}
              disabled={
                isGeneratingAi ||
                (aiMode === "selected" && selectedIndicators.length < 2) ||
                (aiMode === "prompt" && !aiPrompt.trim())
              }
              title={
                aiMode === "selected" && selectedIndicators.length < 2
                  ? "需至少选择 2 个指标"
                  : aiMode === "prompt" && !aiPrompt.trim()
                    ? "请填写 Prompt"
                    : undefined
              }
              className="w-full mb-3 py-2 rounded border border-accent/40 bg-accent-bg text-accent text-[12px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingAi ? "Generating..." : "Generate AI Fusion"}
            </button>

            {aiResult && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-tx-tertiary">AI Result</div>
                    <div className="text-[14px] text-tx-primary font-medium">{aiResult.strategyNameSuggestion}</div>
                    <div className="text-[11px] text-tx-secondary">{aiResult.introduction}</div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-accent-bg text-accent flex items-center justify-center font-mono font-bold text-[13px]">
                    {aiResult.totalScore.toFixed(0)}
                  </div>
                </div>

                <div className="h-[170px] bg-elevated border border-border-subtle rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={aiRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="key" tick={{ fontSize: 11 }} />
                      <Radar dataKey="value" stroke="var(--base-color-accent)" fill="var(--base-color-accent)" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 max-h-[260px] overflow-y-auto">
                  <div className="text-[10px] uppercase tracking-wide text-tx-tertiary mb-1.5">详细分析</div>
                  <div className="text-[12px] text-tx-secondary whitespace-pre-wrap leading-relaxed">{aiResult.analysis}</div>
                </div>

                <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                  {aiResult.indicators.map((row) => (
                    <div key={row.id} className="rounded border border-border-subtle bg-elevated px-2.5 py-2">
                      <div className="text-[12px] text-tx-primary font-medium">{row.name} · {row.weight.toFixed(2)}%</div>
                      <div className="text-[11px] text-tx-secondary">{row.reason}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={applyAiResultToDraft}
                  className="w-full py-2 rounded border border-accent/40 bg-accent-bg text-accent text-[12px] font-medium"
                >
                  应用到草稿
                </button>
              </div>
            )}

            {aiErrorMessage && (
              <div className="mt-3 rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">
                {aiErrorMessage}
              </div>
            )}
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm min-h-[220px] flex flex-col">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-4">Fusion Preview</h2>

            {!preview ? (
              <div className="flex-1 flex flex-col items-center justify-center text-tx-tertiary">
                <FlaskConical size={32} className="mb-2 opacity-50" />
                <p className="text-[12px]">至少选择 2 个指标，并设置融合权重</p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder={preview.name}
                  className="w-full bg-elevated border border-border-subtle rounded px-3 py-2 text-[13px] text-tx-primary"
                />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-up tracking-wider uppercase mb-1">Generated Strategy</div>
                    <h3 className="text-[16px] font-medium text-tx-primary">{preview.name}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-up/20 text-up flex items-center justify-center font-mono font-bold text-[14px]">
                    {preview.score}
                  </div>
                </div>
                <div className="text-[12px] text-tx-secondary bg-elevated p-3 rounded border border-border-subtle">
                  <strong className="text-tx-primary block mb-1">Components:</strong>
                  {preview.components}
                </div>
                <div className="text-[12px] text-tx-secondary bg-page p-3 rounded border border-border-subtle">
                  <strong className="text-tx-primary block mb-1">Fusion Formula:</strong>
                  {preview.formula}
                </div>
                <p className="text-[13px] leading-relaxed text-tx-secondary">{preview.logic}</p>
              </div>
            )}

            <button
              onClick={() => {
                void handleCreateStrategy();
              }}
              disabled={!preview || isSaving || Math.abs(totalWeight - 100) > 0.01}
              className={clsx(
                "mt-6 w-full py-3 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-all duration-200",
                preview && Math.abs(totalWeight - 100) <= 0.01
                  ? "bg-accent text-white hover:opacity-90 shadow-md"
                  : "bg-border-subtle text-tx-tertiary cursor-not-allowed",
              )}
            >
              {isSaving ? (
                <>
                  <Bot size={16} className="animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Create Strategy
                </>
              )}
            </button>
            {Math.abs(totalWeight - 100) > 0.01 && (
              <div className="mt-2 text-[11px] text-down">当前总权重为 {totalWeight.toFixed(2)}%，必须等于 100%。</div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">{errorMessage}</div>
          )}

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-4">Persisted Strategies</h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {strategies.map((strategy) => {
                const origin = parseFusionOrigin(strategy.params);
                return (
                <div key={strategy.id} className="border border-border-subtle rounded-lg p-3 bg-elevated">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-medium text-tx-primary flex items-center gap-2">
                        <span>{strategy.name}</span>
                        <span className="px-1.5 py-0.5 rounded border border-border-subtle text-[10px] text-tx-tertiary bg-page">
                          {fusionOriginLabel(origin)}
                        </span>
                        {runningStrategyIds.has(strategy.id) && (
                          <span className="px-1.5 py-0.5 rounded border border-accent/30 bg-accent-bg text-accent text-[10px]">In Run</span>
                        )}
                      </div>
                      <div className="text-[11px] text-tx-tertiary mt-0.5">{strategy.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          void handleToggleStrategy(strategy.id, strategy.isEnabled);
                        }}
                        className={clsx(
                          "px-2.5 py-1 rounded text-[11px] flex items-center gap-1.5 border",
                          strategy.isEnabled
                            ? "border-up/30 text-up bg-up-bg"
                            : "border-border-subtle text-tx-secondary bg-page",
                        )}
                      >
                        <Power size={12} />
                        {strategy.isEnabled ? "Enabled" : "Disabled"}
                      </button>
                      <button
                        onClick={() => {
                          void handleDeleteStrategy(strategy.id);
                        }}
                        disabled={deletingId === strategy.id || runningStrategyIds.has(strategy.id)}
                        title={runningStrategyIds.has(strategy.id) ? "请先停止关联的运行实例，再删除策略" : undefined}
                        className="px-2.5 py-1 rounded text-[11px] flex items-center gap-1.5 border border-down/30 text-down bg-down-bg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={12} />
                        {deletingId === strategy.id ? "Deleting" : runningStrategyIds.has(strategy.id) ? "In Use" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-tx-tertiary flex items-center gap-1.5 break-all">
                    <Activity size={12} />
                    {JSON.stringify(strategy.params)}
                  </div>
                </div>
              );
              })}
              {strategies.length === 0 && (
                <div className="text-[12px] text-tx-tertiary">No strategies yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

