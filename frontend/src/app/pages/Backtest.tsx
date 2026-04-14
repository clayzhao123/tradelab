import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Play, ShieldAlert, Trash2, TrendingUp, X } from "lucide-react";
import { clsx } from "clsx";
import { useData } from "../contexts/DataContext";
import { useMascot } from "../contexts/MascotContext";
import {
  api,
  toUserErrorMessage,
  type BacktestHistoryDetail,
  type BacktestHistorySummary,
  type BacktestResult,
} from "../../shared/api/client";
import { BacktestSymbolMatrix } from "../components/backtest/BacktestSymbolMatrix";
import { BacktestComparePanels } from "../components/backtest/BacktestComparePanels";
import { BacktestInsightsGrid } from "../components/backtest/BacktestInsightsGrid";
import { BacktestTreemap } from "../components/backtest/BacktestTreemap";
import { BacktestTreemapDetailCard } from "../components/backtest/BacktestTreemapDetailCard";
import { buildTreemapNodes, filterTreemapNodes, formatBacktestSymbol, type HeatmapMetric } from "../components/backtest/backtestHeatmap";
import { PanelInfoButton } from "../components/common/PanelInfoButton";

type MetricCardProps = {
  title: string;
  value: string;
  tone?: "up" | "down" | "neutral";
  icon: ComponentType<{ size?: number; className?: string }>;
};

function MetricCard({ title, value, tone = "neutral", icon: Icon }: MetricCardProps) {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col justify-between h-[100px]">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">{title}</span>
        <Icon size={14} className="text-tx-tertiary" />
      </div>
      <div
        className={clsx(
          "text-[24px] font-mono font-medium",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "neutral" && "text-tx-primary",
        )}
      >
        {value}
      </div>
    </div>
  );
}

const TIMEFRAME_OPTIONS = [
  { value: "1d", label: "日线 (1D)", defaultLookbackBars: 365 },
  { value: "1M", label: "月线 (1M)", defaultLookbackBars: 180 },
  { value: "1y", label: "年线 (1Y)", defaultLookbackBars: 60 },
] as const;

const LOOKBACK_MIN = 24;
const LOOKBACK_MAX = 2000;
const DEFAULT_SELECTION_COUNT = 12;

type BacktestTimeframe = (typeof TIMEFRAME_OPTIONS)[number]["value"];
type DecisionMode = "aggressive" | "neutral" | "conservative";

const DECISION_MODE_OPTIONS: Array<{ value: DecisionMode; label: string; description: string }> = [
  { value: "aggressive", label: "激进", description: "较低阈值，更容易触发交易" },
  { value: "neutral", label: "中性", description: "平衡频率与信号强度" },
  { value: "conservative", label: "保守", description: "较高阈值，减少噪音交易" },
];

const defaultLookbackForTimeframe = (timeframe: BacktestTimeframe): number =>
  TIMEFRAME_OPTIONS.find((option) => option.value === timeframe)?.defaultLookbackBars ?? 365;

const clampLookbackBars = (value: number): number =>
  Math.max(LOOKBACK_MIN, Math.min(LOOKBACK_MAX, Math.round(value)));

export function Backtest() {
  const { strategies, watchlist } = useData();
  const { setBacktesting, setBacktestOutcome } = useMascot();

  const [selectedStrategyId, setSelectedStrategyId] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [timeframe, setTimeframe] = useState<BacktestTimeframe>("1d");
  const [decisionMode, setDecisionMode] = useState<DecisionMode>("neutral");
  const [lookbackBars, setLookbackBars] = useState(() => defaultLookbackForTimeframe("1d"));
  const [initialCapital, setInitialCapital] = useState(10000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [historyItems, setHistoryItems] = useState<BacktestHistorySummary[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);
  const [compareHistoryIds, setCompareHistoryIds] = useState<string[]>([]);
  const [compareDetails, setCompareDetails] = useState<BacktestHistoryDetail[]>([]);
  const [compareErrorMessage, setCompareErrorMessage] = useState<string | null>(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTreemapSymbol, setActiveTreemapSymbol] = useState<string | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>("return");

  const topWatchlist = useMemo(() => watchlist.slice(0, 100), [watchlist]);

  useEffect(() => {
    if (selectedSymbols.length === 0 && topWatchlist.length > 0) {
      setSelectedSymbols(topWatchlist.slice(0, DEFAULT_SELECTION_COUNT).map((item) => item.symbol));
    }
  }, [topWatchlist, selectedSymbols.length]);

  useEffect(() => {
    setLookbackBars(defaultLookbackForTimeframe(timeframe));
  }, [timeframe]);

  const loadHistory = useCallback(async (): Promise<void> => {
    setIsHistoryLoading(true);
    setHistoryErrorMessage(null);
    try {
      const items = await api.getBacktestHistory(50);
      setHistoryItems(items);
    } catch (error) {
      setHistoryErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const chartData = useMemo(() => {
    if (!result) return [] as Array<{ ts: string; equity: number }>;
    return result.portfolio.equityCurve.map((point) => ({
      ts: new Date(point.ts).toLocaleDateString(),
      equity: point.equity,
    }));
  }, [result]);

  const treemapState = useMemo(() => {
    if (!result) {
      return {
        nodes: [],
        summary: { thresholdPct: 0, hiddenCount: 0, visibleCount: 0, universeCount: 0 },
      };
    }
    return filterTreemapNodes(buildTreemapNodes(topWatchlist, result.results));
  }, [result, topWatchlist]);

  const treemapData = treemapState.nodes;

  const activeTreemapNode = useMemo(() => {
    if (!activeTreemapSymbol || treemapData.length === 0) {
      return null;
    }
    return treemapData.find((node) => node.symbol === activeTreemapSymbol) ?? null;
  }, [activeTreemapSymbol, treemapData]);

  const toggleSymbol = (symbol: string): void => {
    setSelectedSymbols((prev) => {
      if (prev.includes(symbol)) {
        return prev.filter((item) => item !== symbol);
      }
      return [...prev, symbol];
    });
  };

  const selectPreset = (count: number): void => {
    setSelectedSymbols(topWatchlist.slice(0, Math.min(count, topWatchlist.length)).map((item) => item.symbol));
  };

  const runBacktest = async (): Promise<void> => {
    if (selectedSymbols.length === 0) {
      return;
    }
    const normalizedLookbackBars = clampLookbackBars(lookbackBars);
    if (normalizedLookbackBars !== lookbackBars) {
      setLookbackBars(normalizedLookbackBars);
    }
    setErrorMessage(null);
    setIsRunning(true);
    try {
      const next = await api.runBacktest({
        strategyId: selectedStrategyId || undefined,
        symbols: selectedSymbols,
        timeframe,
        lookbackBars: normalizedLookbackBars,
        initialCapital,
        decisionMode,
      });
      setCompareHistoryIds([]);
      setCompareDetails([]);
      setCompareErrorMessage(null);
      setResult(next);
      setActiveHistoryId(next.backtestRunId);
      setActiveTreemapSymbol(next.results[0]?.symbol ?? null);
      const isWarning = next.portfolio.totalReturnPct < 0 || next.portfolio.avgStabilityScore < 50;
      setBacktestOutcome(isWarning ? "warning" : "success");
      void loadHistory();
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    setBacktesting(isRunning);
    return () => setBacktesting(false);
  }, [isRunning, setBacktesting]);

  const replayHistory = async (id: string): Promise<void> => {
    setHistoryLoadingId(id);
    setErrorMessage(null);
    try {
      const detail = await api.getBacktestHistoryDetail(id);
      const replayResult: BacktestResult = {
        ...detail,
        backtestRunId: detail.backtestRunId || detail.id,
      };
      setCompareHistoryIds([]);
      setCompareDetails([]);
      setCompareErrorMessage(null);
      setResult(replayResult);
      setActiveHistoryId(detail.id);
      setActiveTreemapSymbol(replayResult.results[0]?.symbol ?? null);
      setSelectedStrategyId(replayResult.strategy.id ?? "");
      const nextTimeframe = TIMEFRAME_OPTIONS.some((option) => option.value === replayResult.timeframe)
        ? (replayResult.timeframe as BacktestTimeframe)
        : timeframe;
      setTimeframe(nextTimeframe);
      setLookbackBars(clampLookbackBars(replayResult.lookbackBars));
      setInitialCapital(replayResult.initialCapital);
      setDecisionMode(replayResult.strategy.decisionThreshold.mode);
      setSelectedSymbols(replayResult.symbols);
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const clearActiveResult = (): void => {
    setResult(null);
    setActiveHistoryId(null);
    setActiveTreemapSymbol(null);
  };

  const toggleCompareHistory = (id: string): void => {
    setCompareErrorMessage(null);
    setCompareHistoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const clearCompare = (): void => {
    setCompareHistoryIds([]);
    setCompareDetails([]);
    setCompareErrorMessage(null);
  };

  const runCompare = async (): Promise<void> => {
    if (compareHistoryIds.length < 2) {
      setCompareErrorMessage("至少选择 2 条回测历史才能进行 compare。");
      return;
    }
    setCompareErrorMessage(null);
    setErrorMessage(null);
    setIsCompareLoading(true);
    try {
      const details = await Promise.all(compareHistoryIds.map((id) => api.getBacktestHistoryDetail(id)));
      setCompareDetails(details);
      clearActiveResult();
    } catch (error) {
      setCompareErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsCompareLoading(false);
    }
  };

  const deleteHistoryItem = async (id: string): Promise<void> => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this backtest history record? This action cannot be undone.");
      if (!confirmed) {
        return;
      }
    }
    setDeletingHistoryId(id);
    setErrorMessage(null);
    setCompareErrorMessage(null);
    try {
      await api.deleteBacktestHistory(id);
      if (activeHistoryId === id) {
        clearActiveResult();
      }
      setCompareHistoryIds((prev) => prev.filter((item) => item !== id));
      setCompareDetails((prev) => prev.filter((item) => item.id !== id));
      await loadHistory();
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setDeletingHistoryId(null);
    }
  };

  const skippedSymbolsCount = result ? Math.max(0, selectedSymbols.length - result.results.length) : 0;
  const isCompareMode = compareDetails.length >= 2;

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-[1380px] mx-auto overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-medium text-tx-primary mb-1">Backtest Engine</h1>
        <p className="text-[13px] text-tx-secondary">基于选定币种历史曲线，按日线/月线/年线频率回测并输出各币种稳定性表现，并在热力图里聚焦每个币种的交易路径。</p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm mb-6 flex flex-col gap-4">
        <div className="grid grid-cols-12 gap-3">
          <select
            value={selectedStrategyId}
            onChange={(event) => setSelectedStrategyId(event.target.value)}
            className="col-span-12 lg:col-span-3 bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary"
          >
            <option value="">Custom Weighted Fusion (No persisted strategy)</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>

          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as BacktestTimeframe)}
            className="col-span-6 lg:col-span-2 bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary"
          >
            {TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={decisionMode}
            onChange={(event) => setDecisionMode(event.target.value as DecisionMode)}
            className="col-span-6 lg:col-span-2 bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary"
          >
            {DECISION_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                决策强度: {option.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={lookbackBars}
            min={LOOKBACK_MIN}
            max={LOOKBACK_MAX}
            step={1}
            onChange={(event) => setLookbackBars(clampLookbackBars(Number(event.target.value)))}
            className="col-span-6 lg:col-span-2 bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary"
            placeholder="Lookback bars"
          />

          <input
            type="number"
            value={initialCapital}
            min={100}
            step={100}
            onChange={(event) => setInitialCapital(Number(event.target.value))}
            className="col-span-6 lg:col-span-1 bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary"
            placeholder="Initial capital"
          />

          <button
            onClick={() => {
              void runBacktest();
            }}
            disabled={selectedSymbols.length === 0 || isRunning}
            className="col-span-12 lg:col-span-2 py-2.5 bg-tx-primary text-page rounded-md text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {isRunning ? `Running ${selectedSymbols.length}...` : <><Play size={14} /> Run Backtest</>}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <BacktestSymbolMatrix
            items={topWatchlist}
            selectedSymbols={selectedSymbols}
            searchQuery={symbolSearch}
            onSearchChange={setSymbolSearch}
            onToggleSymbol={toggleSymbol}
            onSelectPreset={selectPreset}
            onClear={() => setSelectedSymbols([])}
          />

          <div className="border border-border-subtle rounded-lg p-4 bg-elevated">
            <div className="text-[11px] text-tx-tertiary uppercase tracking-wide mb-2">Selected symbols ({selectedSymbols.length}/100)</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedSymbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => toggleSymbol(symbol)}
                  className="px-2 py-1 rounded-full border border-accent/40 bg-accent-bg text-accent text-[11px]"
                >
                  {formatBacktestSymbol(symbol)} ×
                </button>
              ))}
              {selectedSymbols.length === 0 && (
                <div className="text-[12px] text-tx-tertiary">No symbols selected.</div>
              )}
            </div>
            <div className="mt-4 text-[11px] text-tx-tertiary space-y-1">
              <div>回测逻辑: 使用策略融合权重将趋势/动量/均值回归/波动率/成交量/结构信号加权，生成每根K线持仓并计入交易成本。</div>
              <div>频率切换会自动应用回看默认值: 1D=365, 1M=180, 1Y=60。</div>
              <div>Top100 矩阵按 watchlist 固定排序，搜索仅高亮匹配项，不会打乱格子位置。</div>
              {result && (
                <div>
                  当前回测强度 {DECISION_MODE_OPTIONS.find((option) => option.value === result.strategy.decisionThreshold.mode)?.label ?? "中性"}：
                  自动阈值 long {">="} {result.strategy.decisionThreshold.long.toFixed(4)} / short {"<="} {result.strategy.decisionThreshold.short.toFixed(4)}（quantile {(result.strategy.decisionThreshold.quantile * 100).toFixed(0)}%，samples {result.strategy.decisionThreshold.sampleSize}）。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Backtest History</h2>
                <PanelInfoButton label="Stores saved backtest runs on the backend so you can replay, compare, or delete them after reopening the app." />
              </div>
              <button
                onClick={() => {
                  void loadHistory();
                }}
                className="text-[11px] px-2 py-1 rounded border border-border-subtle bg-elevated text-tx-secondary hover:text-tx-primary"
              >
                Refresh
              </button>
            </div>
            {historyErrorMessage && (
              <div className="mb-3 rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">{historyErrorMessage}</div>
            )}
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
              {isHistoryLoading && historyItems.length === 0 ? (
                <div className="text-[12px] text-tx-tertiary">Loading history...</div>
              ) : historyItems.length === 0 ? (
                <div className="text-[12px] text-tx-tertiary">No backtest history yet.</div>
              ) : (
                historyItems.map((item) => {
                  const isActive = activeHistoryId === item.id && Boolean(result);
                  const isSelectedForCompare = compareHistoryIds.includes(item.id);
                  const isBusy = historyLoadingId === item.id || deletingHistoryId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={clsx(
                        "rounded-xl border px-4 py-3 transition-colors",
                        isActive || isSelectedForCompare
                          ? "border-accent bg-accent-bg"
                          : "border-border-subtle bg-elevated hover:border-border-default",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelectedForCompare}
                            onChange={() => toggleCompareHistory(item.id)}
                            className="mt-1 h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
                          />
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-tx-primary truncate">
                              {item.strategyName ?? "Custom Weighted Fusion"} · {item.timeframe} · {item.symbolsCount} symbols
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-tx-secondary">
                              <span>Return {item.portfolio.totalReturnPct >= 0 ? "+" : ""}{item.portfolio.totalReturnPct.toFixed(2)}%</span>
                              <span>Max DD {item.portfolio.maxDrawdownPct.toFixed(2)}%</span>
                              <span>Sharpe {item.portfolio.sharpe.toFixed(3)}</span>
                              <span>Capital {item.initialCapital.toFixed(0)}</span>
                            </div>
                          </div>
                        </label>
                        <div className="text-[11px] text-tx-tertiary whitespace-nowrap">
                          {new Date(item.generatedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-tx-tertiary">
                          {isSelectedForCompare ? "Selected for compare" : isActive ? "Opened in result view" : "Saved run"}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isActive) {
                                clearActiveResult();
                                return;
                              }
                              void replayHistory(item.id);
                            }}
                            disabled={isBusy}
                            className="text-[11px] px-2.5 py-1.5 rounded border border-border-subtle bg-surface text-tx-secondary hover:text-tx-primary disabled:opacity-50"
                          >
                            {historyLoadingId === item.id ? "Loading..." : isActive ? "Collapse" : "Replay"}
                          </button>
                          <button
                            onClick={() => {
                              void deleteHistoryItem(item.id);
                            }}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded border border-down/30 bg-down-bg text-down hover:opacity-90 disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            {deletingHistoryId === item.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border border-border-subtle rounded-xl bg-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Compare</div>
                <PanelInfoButton label="Pick multiple saved runs and compare the key analytics side by side without loading the large heatmap view." />
              </div>
              {compareHistoryIds.length > 0 ? (
                <button
                  onClick={clearCompare}
                  className="text-[11px] px-2 py-1 rounded border border-border-subtle bg-surface text-tx-secondary hover:text-tx-primary"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="text-[12px] text-tx-secondary leading-5">
              先在左侧勾选多个 history 条目，再点击 compare。对比视图会展示关键统计面板，不包含热力图。
            </div>
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-tx-tertiary">Selected runs</div>
              <div className="mt-1 text-[24px] font-mono text-tx-primary">{compareHistoryIds.length}</div>
              <div className="text-[11px] text-tx-tertiary">Need at least 2 runs to compare.</div>
            </div>
            <button
              onClick={() => {
                void runCompare();
              }}
              disabled={compareHistoryIds.length < 2 || isCompareLoading}
              className="mt-4 w-full py-2.5 rounded-md bg-tx-primary text-page text-[13px] font-medium disabled:opacity-50"
            >
              {isCompareLoading ? "Comparing..." : "Run Compare"}
            </button>
            {compareErrorMessage ? (
              <div className="mt-3 rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">{compareErrorMessage}</div>
            ) : null}
            {isCompareMode ? (
              <div className="mt-3 rounded-lg border border-accent/30 bg-accent-bg px-3 py-2 text-[12px] text-accent">
                Compare view is active. Replay a single run or click Clear to leave compare mode.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">{errorMessage}</div>
      )}

      {isCompareMode ? (
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Compare Results</h3>
              <PanelInfoButton label="Shows the selected backtest history entries side by side across the most decision-useful summary panels." />
            </div>
            <button
              onClick={clearCompare}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded border border-border-subtle bg-elevated text-tx-secondary hover:text-tx-primary"
            >
              <X size={12} />
              Close Compare
            </button>
          </div>
          <BacktestComparePanels details={compareDetails} />
        </div>
      ) : result ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Active Backtest Result</h2>
              <PanelInfoButton label="Shows the currently replayed or newly generated run. Collapse it when you want to return to the empty state." />
            </div>
            <button
              onClick={clearActiveResult}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded border border-border-subtle bg-elevated text-tx-secondary hover:text-tx-primary"
            >
              <X size={12} />
              Collapse
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Portfolio Return"
              value={`${result.portfolio.totalReturnPct >= 0 ? "+" : ""}${result.portfolio.totalReturnPct.toFixed(2)}%`}
              tone={result.portfolio.totalReturnPct >= 0 ? "up" : "down"}
              icon={TrendingUp}
            />
            <MetricCard
              title="Max Drawdown"
              value={`${result.portfolio.maxDrawdownPct.toFixed(2)}%`}
              tone="down"
              icon={ShieldAlert}
            />
            <MetricCard
              title="Portfolio Sharpe"
              value={result.portfolio.sharpe.toFixed(3)}
              tone={result.portfolio.sharpe >= 0 ? "up" : "down"}
              icon={Activity}
            />
            <MetricCard
              title="Avg Stability"
              value={`${result.portfolio.avgStabilityScore.toFixed(2)}`}
              tone={result.portfolio.avgStabilityScore >= 50 ? "up" : "neutral"}
              icon={ShieldAlert}
            />
            <MetricCard
              title="Best / Worst"
              value={`${result.portfolio.bestSymbol ? formatBacktestSymbol(result.portfolio.bestSymbol) : "-"} / ${result.portfolio.worstSymbol ? formatBacktestSymbol(result.portfolio.worstSymbol) : "-"}`}
              tone="neutral"
              icon={TrendingUp}
            />
          </div>

          {skippedSymbolsCount > 0 ? (
            <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              {skippedSymbolsCount} selected symbols were skipped because there was not enough historical data to compute the backtest result.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <BacktestTreemap
              data={treemapData}
              activeSymbol={activeTreemapNode?.symbol ?? null}
              onActivate={(node) => setActiveTreemapSymbol(node.symbol)}
              generatedAt={result.generatedAt}
              timeframe={result.timeframe}
              lookbackBars={result.lookbackBars}
              colorMetric={heatmapMetric}
              onColorMetricChange={setHeatmapMetric}
              visibilitySummary={treemapState.summary}
            />
            <BacktestTreemapDetailCard node={activeTreemapNode} />
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Backtest Insights</h3>
              <PanelInfoButton label="Adds trade, drawdown, breadth, benchmark, and exposure diagnostics beneath the heatmap for deeper evaluation." />
            </div>
            <BacktestInsightsGrid result={result} />
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Portfolio Equity Curve</h3>
              <PanelInfoButton label="Tracks how total portfolio equity changed through time during the selected backtest run." />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="portfolioEquityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--base-color-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--base-color-accent)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--base-bg-elevated)",
                      border: "1px solid var(--base-border-default)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--base-text-secondary)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="var(--base-color-accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#portfolioEquityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Per Symbol Backtest Results</h3>
              <PanelInfoButton label="Breaks the run down symbol by symbol so you can see which instruments carried or hurt the portfolio." />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-tx-tertiary border-b border-border-subtle">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-right py-2">Return</th>
                    <th className="text-right py-2">Max DD</th>
                    <th className="text-right py-2">Win Rate</th>
                    <th className="text-right py-2">Volatility</th>
                    <th className="text-right py-2">Sharpe</th>
                    <th className="text-right py-2">Trades</th>
                    <th className="text-right py-2">Stability</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row) => (
                    <tr key={row.symbol} className="border-b border-border-subtle/60">
                      <td className="py-2 font-medium text-tx-primary">{formatBacktestSymbol(row.symbol)}</td>
                      <td className={clsx("py-2 text-right font-mono", row.totalReturnPct >= 0 ? "text-up" : "text-down")}>
                        {row.totalReturnPct >= 0 ? "+" : ""}
                        {row.totalReturnPct.toFixed(2)}%
                      </td>
                      <td className="py-2 text-right font-mono text-down">{row.maxDrawdownPct.toFixed(2)}%</td>
                      <td className="py-2 text-right font-mono text-tx-primary">{row.winRatePct.toFixed(2)}%</td>
                      <td className="py-2 text-right font-mono text-tx-primary">{row.volatilityPct.toFixed(2)}%</td>
                      <td className="py-2 text-right font-mono text-tx-primary">{row.sharpe.toFixed(3)}</td>
                      <td className="py-2 text-right font-mono text-tx-primary">{row.trades}</td>
                      <td className="py-2 text-right font-mono text-tx-primary">{row.stabilityScore.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border-subtle rounded-xl p-10 text-center text-[13px] text-tx-tertiary">
          配置参数后点击 Run Backtest，将按你选择的币种和日/月/年线频率生成回测结果，并在热力图中查看每个币种的收益路径。
        </div>
      )}
    </div>
  );
}







