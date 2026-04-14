import type { MarketWatchlistItem, BacktestSymbolResult } from "../../../shared/api/client";

export type HeatmapMetric = "return" | "stability" | "sharpe";

export type BacktestTreemapNode = BacktestSymbolResult & {
  name: string;
  shortSymbol: string;
  size: number;
  rank: number;
  marketCapUsd: number;
};

export type HeatmapVisibilitySummary = {
  thresholdPct: number;
  hiddenCount: number;
  visibleCount: number;
  universeCount: number;
};

type HeatmapMetricConfig = {
  label: string;
  shortLabel: string;
  description: string;
  min: number;
  max: number;
  midpointLabel: string;
  negativeLabel: string;
  positiveLabel: string;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const interpolateChannel = (from: number, to: number, ratio: number): number =>
  Math.round(from + (to - from) * ratio);

const interpolateRgb = (
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  ratio: number,
): string => {
  const safeRatio = clamp(ratio, 0, 1);
  return `rgb(${interpolateChannel(from[0], to[0], safeRatio)}, ${interpolateChannel(from[1], to[1], safeRatio)}, ${interpolateChannel(from[2], to[2], safeRatio)})`;
};

const quantile = (values: number[], q: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = clamp(q, 0, 1) * (sorted.length - 1);
  const lowerIdx = Math.floor(position);
  const upperIdx = Math.ceil(position);
  if (lowerIdx === upperIdx) {
    return sorted[lowerIdx];
  }
  const weight = position - lowerIdx;
  return sorted[lowerIdx] * (1 - weight) + sorted[upperIdx] * weight;
};

const HEATMAP_CONFIG: Record<HeatmapMetric, HeatmapMetricConfig> = {
  return: {
    label: "Total Return",
    shortLabel: "Return",
    description: "Color intensity follows each symbol's total return for this backtest run.",
    min: -15,
    max: 15,
    midpointLabel: "0%",
    negativeLabel: "-15%",
    positiveLabel: "+15%",
  },
  stability: {
    label: "Stability Score",
    shortLabel: "Stability",
    description: "Color intensity follows stability score, emphasizing smoother and more resilient symbols.",
    min: 0,
    max: 100,
    midpointLabel: "50",
    negativeLabel: "0",
    positiveLabel: "100",
  },
  sharpe: {
    label: "Sharpe Ratio",
    shortLabel: "Sharpe",
    description: "Color intensity follows Sharpe ratio, balancing return versus realized volatility.",
    min: -1.5,
    max: 2.5,
    midpointLabel: "0.5",
    negativeLabel: "-1.5",
    positiveLabel: "+2.5",
  },
};

const SYMBOL_ALIASES: Record<string, string> = {
  BITCOIN: "BTC",
  ETHEREUM: "ETH",
  BINANCECOIN: "BNB",
  RIPPLE: "XRP",
  SOLANA: "SOL",
  DOGECOIN: "DOGE",
};

export const formatBacktestSymbol = (symbol: string): string => {
  const trimmed = symbol.trim().replace(/USDT$/i, "");
  if (!trimmed) {
    return symbol;
  }
  return SYMBOL_ALIASES[trimmed.toUpperCase()] ?? trimmed;
};

export const buildTreemapNodes = (
  watchlist: MarketWatchlistItem[],
  results: BacktestSymbolResult[],
): BacktestTreemapNode[] => {
  const watchlistBySymbol = new Map(watchlist.map((item) => [item.symbol, item]));

  return results.map((row, index) => {
    const market = watchlistBySymbol.get(row.symbol);
    const rank = market?.rank ?? index + 1;
    const marketCapUsd = market?.marketCapUsd ?? 0;
    return {
      ...row,
      name: row.symbol,
      shortSymbol: formatBacktestSymbol(row.symbol),
      size: marketCapUsd > 0 ? marketCapUsd : Math.max(1, 101 - rank),
      rank,
      marketCapUsd,
    };
  });
};

export const filterTreemapNodes = (
  nodes: BacktestTreemapNode[],
  minimumVisible = 10,
): { nodes: BacktestTreemapNode[]; summary: HeatmapVisibilitySummary } => {
  if (nodes.length === 0) {
    return {
      nodes,
      summary: { thresholdPct: 0, hiddenCount: 0, visibleCount: 0, universeCount: 0 },
    };
  }

  const absReturns = nodes.map((node) => Math.abs(node.totalReturnPct));
  const dynamicThreshold = Math.max(10, quantile(absReturns, 0.7));
  const byMagnitude = [...nodes].sort((a, b) => Math.abs(b.totalReturnPct) - Math.abs(a.totalReturnPct));
  const guaranteed = new Set(byMagnitude.slice(0, Math.min(minimumVisible, byMagnitude.length)).map((node) => node.symbol));
  const visible = nodes.filter((node) => guaranteed.has(node.symbol) || Math.abs(node.totalReturnPct) >= dynamicThreshold);

  return {
    nodes: visible,
    summary: {
      thresholdPct: Number(dynamicThreshold.toFixed(2)),
      hiddenCount: Math.max(0, nodes.length - visible.length),
      visibleCount: visible.length,
      universeCount: nodes.length,
    },
  };
};

export const getHeatmapMetricConfig = (metric: HeatmapMetric): HeatmapMetricConfig => HEATMAP_CONFIG[metric];

export const getMetricValue = (node: BacktestTreemapNode, metric: HeatmapMetric): number => {
  if (metric === "stability") return node.stabilityScore;
  if (metric === "sharpe") return node.sharpe;
  return node.totalReturnPct;
};

export const formatMetricValue = (metric: HeatmapMetric, value: number): string => {
  if (metric === "stability") {
    return value.toFixed(1);
  }
  if (metric === "sharpe") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

export const getHeatmapFill = (node: BacktestTreemapNode, metric: HeatmapMetric): string => {
  const config = HEATMAP_CONFIG[metric];
  const value = clamp(getMetricValue(node, metric), config.min, config.max);

  if (metric === "stability") {
    return interpolateRgb([242, 237, 228], [141, 190, 115], value / config.max);
  }

  const midpoint = metric === "sharpe" ? 0.5 : 0;
  if (value >= midpoint) {
    return interpolateRgb([241, 240, 235], [147, 197, 114], (value - midpoint) / Math.max(0.0001, config.max - midpoint));
  }
  return interpolateRgb([241, 240, 235], [222, 116, 136], Math.abs((value - midpoint) / Math.max(0.0001, config.min - midpoint)));
};

export const getHeatmapStroke = (isActive: boolean): string =>
  isActive ? "rgba(22, 21, 19, 0.95)" : "rgba(60, 58, 52, 0.18)";

export const getHeatmapTextColor = (node: BacktestTreemapNode, metric: HeatmapMetric): string => {
  const value = getMetricValue(node, metric);
  if (metric === "stability") {
    return value >= 65 ? "#14130f" : "#26251f";
  }
  return Math.abs(value) >= (metric === "sharpe" ? 1.1 : 8) ? "#171611" : "#26251f";
};

export const summarizeSelection = (selectedCount: number): string => {
  if (selectedCount === 0) return "No symbols selected";
  if (selectedCount === 100) return "All Top100 symbols selected";
  return `${selectedCount} symbols selected`;
};
