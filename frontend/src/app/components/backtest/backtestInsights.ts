import type { BacktestHistoryDetail, BacktestResult, BacktestSymbolResult } from "../../../shared/api/client";

export type TradePair = {
  symbol: string;
  tradeIndex: number;
  buyTs: string;
  sellTs: string;
  buyPrice: number;
  sellPrice: number;
  returnPct: number;
  durationMs: number;
};

export type TradeStatsSummary = {
  totalTrades: number;
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  payoffRatio: number;
  expectancyPct: number;
  avgHoldLabel: string;
  longestWinStreak: number;
  longestLossStreak: number;
};

export type DrawdownPoint = {
  index: number;
  ts: string;
  drawdownPct: number;
};

export type DrawdownEpisode = {
  startTs: string;
  troughTs: string;
  recoveryTs: string | null;
  depthPct: number;
  durationBars: number;
  recoveryBars: number | null;
};

export type DrawdownSummary = {
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  recoveryFactor: number;
  underwaterCurve: DrawdownPoint[];
  topEpisodes: DrawdownEpisode[];
};

export type DistributionSummary = {
  profitableSymbols: number;
  profitableSymbolsPct: number;
  medianReturnPct: number;
  p25ReturnPct: number;
  p75ReturnPct: number;
  returnStdPct: number;
  sharpeStd: number;
  skippedSymbolsCount: number;
};

export type BenchmarkPoint = {
  index: number;
  ts: string;
  strategyEquity: number;
  benchmarkEquity: number;
};

export type BenchmarkSummary = {
  benchmarkReturnPct: number;
  strategyReturnPct: number;
  alphaPct: number;
  benchmarkSharpe: number;
  curve: BenchmarkPoint[];
};

export type ExposureSummary = {
  longBarsPct: number;
  shortBarsPct: number;
  flatBarsPct: number;
  longReturnPct: number;
  shortReturnPct: number;
  directionalBias: string;
};

export type CompareSnapshot = {
  id: string;
  label: string;
  strategyName: string;
  generatedAt: string;
  symbolsCount: number;
  portfolioReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  avgStabilityScore: number;
  totalTrades: number;
  tradeWinRatePct: number;
  expectancyPct: number;
  profitableSymbolsPct: number;
  medianReturnPct: number;
  alphaPct: number;
  benchmarkReturnPct: number;
  longBarsPct: number;
  shortBarsPct: number;
  flatBarsPct: number;
  longReturnPct: number;
  shortReturnPct: number;
};

const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const std = (values: number[]): number => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const quantile = (values: number[], q: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.max(0, Math.min(1, q)) * (sorted.length - 1);
  const lowerIdx = Math.floor(position);
  const upperIdx = Math.ceil(position);
  if (lowerIdx === upperIdx) {
    return sorted[lowerIdx];
  }
  const weight = position - lowerIdx;
  return sorted[lowerIdx] * (1 - weight) + sorted[upperIdx] * weight;
};

export const formatDurationLabel = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "-";
  }
  let remainingMinutes = Math.max(1, Math.round(durationMs / 60000));
  const days = Math.floor(remainingMinutes / (60 * 24));
  remainingMinutes -= days * 60 * 24;
  const hours = Math.floor(remainingMinutes / 60);
  remainingMinutes -= hours * 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (remainingMinutes > 0 && parts.length < 2) parts.push(`${remainingMinutes}m`);
  return parts.join(" ") || "0m";
};

const getTradePairsForSymbol = (symbolRow: BacktestSymbolResult): TradePair[] => {
  const indexByTs = new Map(symbolRow.priceCurve.map((point, index) => [point.ts, index]));
  return symbolRow.tradeMarkers
    .filter((marker) => marker.action === "buy" && marker.linkedTs && marker.linkedPrice != null)
    .map((marker) => {
      const returnPct = ((Number(marker.linkedPrice) - marker.price) / Math.max(marker.price, 1e-9)) * 100;
      const buyTime = new Date(marker.ts).getTime();
      const sellTime = marker.linkedTs ? new Date(marker.linkedTs).getTime() : Number.NaN;
      return {
        symbol: symbolRow.symbol,
        tradeIndex: marker.tradeIndex,
        buyTs: marker.ts,
        sellTs: marker.linkedTs ?? marker.ts,
        buyPrice: marker.price,
        sellPrice: Number(marker.linkedPrice ?? marker.price),
        returnPct: Number(returnPct.toFixed(2)),
        durationMs:
          Number.isFinite(buyTime) && Number.isFinite(sellTime) && sellTime > buyTime ? sellTime - buyTime : 0,
        // Keep chronological sort stable across symbols.
        _sortIndex: indexByTs.get(marker.ts) ?? 0,
      } as TradePair & { _sortIndex: number };
    })
    .sort((a, b) => {
      const timeDiff = a.sellTs.localeCompare(b.sellTs);
      if (timeDiff !== 0) return timeDiff;
      return a._sortIndex - b._sortIndex;
    })
    .map(({ _sortIndex, ...trade }) => trade);
};

export const getAllTradePairs = (result: BacktestResult | BacktestHistoryDetail): TradePair[] =>
  result.results.flatMap((symbolRow) => getTradePairsForSymbol(symbolRow));

export const summarizeTradeStats = (result: BacktestResult | BacktestHistoryDetail): TradeStatsSummary => {
  const trades = getAllTradePairs(result);
  const wins = trades.filter((trade) => trade.returnPct > 0);
  const losses = trades.filter((trade) => trade.returnPct < 0);

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  for (const trade of trades) {
    if (trade.returnPct > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
    } else if (trade.returnPct < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
    longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
  }

  const avgWinPct = mean(wins.map((trade) => trade.returnPct));
  const avgLossPct = mean(losses.map((trade) => Math.abs(trade.returnPct)));
  const payoffRatio = avgLossPct > 0 ? avgWinPct / avgLossPct : avgWinPct > 0 ? 999 : 0;
  const expectancyPct = mean(trades.map((trade) => trade.returnPct));

  return {
    totalTrades: trades.length,
    winRatePct: trades.length > 0 ? Number(((wins.length / trades.length) * 100).toFixed(2)) : 0,
    avgWinPct: Number(avgWinPct.toFixed(2)),
    avgLossPct: Number(avgLossPct.toFixed(2)),
    payoffRatio: Number(payoffRatio.toFixed(2)),
    expectancyPct: Number(expectancyPct.toFixed(2)),
    avgHoldLabel: formatDurationLabel(mean(trades.map((trade) => trade.durationMs))),
    longestWinStreak,
    longestLossStreak,
  };
};

export const summarizeDrawdowns = (result: BacktestResult | BacktestHistoryDetail): DrawdownSummary => {
  type PendingDrawdownEpisode = {
    startIndex: number;
    troughIndex: number;
    troughEquity: number;
    depthPct: number;
  };

  const curve = result.portfolio.equityCurve;
  if (curve.length === 0) {
    return {
      maxDrawdownPct: 0,
      currentDrawdownPct: 0,
      recoveryFactor: 0,
      underwaterCurve: [],
      topEpisodes: [],
    };
  }

  let peak = curve[0].equity;
  let peakIndex = 0;
  let currentEpisode: PendingDrawdownEpisode | null = null;
  const episodes: DrawdownEpisode[] = [];
  const underwaterCurve: DrawdownPoint[] = curve.map((point, index) => {
    if (point.equity >= peak) {
      if (currentEpisode) {
        episodes.push({
          startTs: curve[currentEpisode.startIndex].ts,
          troughTs: curve[currentEpisode.troughIndex].ts,
          recoveryTs: point.ts,
          depthPct: Number(currentEpisode.depthPct.toFixed(2)),
          durationBars: currentEpisode.troughIndex - currentEpisode.startIndex + 1,
          recoveryBars: index - currentEpisode.startIndex,
        });
        currentEpisode = null;
      }
      peak = point.equity;
      peakIndex = index;
      return { index, ts: point.ts, drawdownPct: 0 };
    }

    const drawdownPct = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0;
    if (!currentEpisode) {
      currentEpisode = {
        startIndex: peakIndex,
        troughIndex: index,
        troughEquity: point.equity,
        depthPct: drawdownPct,
      };
    } else if (point.equity <= currentEpisode.troughEquity) {
      currentEpisode = {
        ...currentEpisode,
        troughIndex: index,
        troughEquity: point.equity,
        depthPct: Math.max(currentEpisode.depthPct, drawdownPct),
      };
    }
    return { index, ts: point.ts, drawdownPct: Number(drawdownPct.toFixed(2)) };
  });

  const finalEpisode = currentEpisode as PendingDrawdownEpisode | null;
  if (finalEpisode) {
    episodes.push({
      startTs: curve[finalEpisode.startIndex].ts,
      troughTs: curve[finalEpisode.troughIndex].ts,
      recoveryTs: null,
      depthPct: Number(finalEpisode.depthPct.toFixed(2)),
      durationBars: finalEpisode.troughIndex - finalEpisode.startIndex + 1,
      recoveryBars: null,
    });
  }

  return {
    maxDrawdownPct: Number(result.portfolio.maxDrawdownPct.toFixed(2)),
    currentDrawdownPct: underwaterCurve[underwaterCurve.length - 1]?.drawdownPct ?? 0,
    recoveryFactor:
      result.portfolio.maxDrawdownPct > 0
        ? Number((result.portfolio.totalReturnPct / result.portfolio.maxDrawdownPct).toFixed(2))
        : 0,
    underwaterCurve,
    topEpisodes: episodes.sort((a, b) => b.depthPct - a.depthPct).slice(0, 3),
  };
};

export const summarizeDistribution = (result: BacktestResult | BacktestHistoryDetail): DistributionSummary => {
  const returns = result.results.map((row) => row.totalReturnPct);
  const sharpes = result.results.map((row) => row.sharpe);
  const profitableSymbols = result.results.filter((row) => row.totalReturnPct > 0).length;
  return {
    profitableSymbols,
    profitableSymbolsPct: result.results.length > 0 ? Number(((profitableSymbols / result.results.length) * 100).toFixed(2)) : 0,
    medianReturnPct: Number(quantile(returns, 0.5).toFixed(2)),
    p25ReturnPct: Number(quantile(returns, 0.25).toFixed(2)),
    p75ReturnPct: Number(quantile(returns, 0.75).toFixed(2)),
    returnStdPct: Number(std(returns).toFixed(2)),
    sharpeStd: Number(std(sharpes).toFixed(3)),
    skippedSymbolsCount: Math.max(0, result.symbols.length - result.results.length),
  };
};

const periodsPerYear = (timeframe: string): number => {
  const normalized = timeframe.trim();
  const match = normalized.match(/^(\d+)([mhdwyM])$/);
  if (!match) return 365;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "m") return (365 * 24 * 60) / value;
  if (unit === "h") return (365 * 24) / value;
  if (unit === "d") return 365 / value;
  if (unit === "w") return 52 / value;
  if (unit === "M") return 12 / value;
  if (unit === "y") return 1 / value;
  return 365;
};

export const summarizeBenchmark = (result: BacktestResult | BacktestHistoryDetail): BenchmarkSummary => {
  const eligible = result.results.filter((row) => row.priceCurve.length > 1);
  if (eligible.length === 0 || result.portfolio.equityCurve.length === 0) {
    return {
      benchmarkReturnPct: 0,
      strategyReturnPct: result.portfolio.totalReturnPct,
      alphaPct: result.portfolio.totalReturnPct,
      benchmarkSharpe: 0,
      curve: [],
    };
  }

  const minLength = Math.min(
    result.portfolio.equityCurve.length,
    ...eligible.map((row) => row.priceCurve.length),
  );
  const alignedSymbols = eligible.map((row) => row.priceCurve.slice(-minLength));
  const alignedStrategy = result.portfolio.equityCurve.slice(-minLength);
  const benchmarkCurve: BenchmarkPoint[] = Array.from({ length: minLength }, (_, index) => {
    const benchmarkEquity = mean(
      alignedSymbols.map((series) => {
        const first = series[0].price;
        return first > 0 ? result.initialCapital * (series[index].price / first) : result.initialCapital;
      }),
    );
    return {
      index,
      ts: alignedStrategy[index].ts,
      strategyEquity: alignedStrategy[index].equity,
      benchmarkEquity: Number(benchmarkEquity.toFixed(2)),
    };
  });

  const benchmarkReturns = benchmarkCurve.slice(1).map((point, index) => {
    const prev = benchmarkCurve[index].benchmarkEquity;
    return prev > 0 ? point.benchmarkEquity / prev - 1 : 0;
  });
  const benchmarkStd = std(benchmarkReturns);
  const benchmarkSharpe =
    benchmarkReturns.length > 1 && benchmarkStd > 0
      ? (mean(benchmarkReturns) / benchmarkStd) * Math.sqrt(periodsPerYear(result.timeframe))
      : 0;
  const first = benchmarkCurve[0]?.benchmarkEquity ?? result.initialCapital;
  const last = benchmarkCurve[benchmarkCurve.length - 1]?.benchmarkEquity ?? result.initialCapital;
  const benchmarkReturnPct = first > 0 ? ((last - first) / first) * 100 : 0;

  return {
    benchmarkReturnPct: Number(benchmarkReturnPct.toFixed(2)),
    strategyReturnPct: Number(result.portfolio.totalReturnPct.toFixed(2)),
    alphaPct: Number((result.portfolio.totalReturnPct - benchmarkReturnPct).toFixed(2)),
    benchmarkSharpe: Number(benchmarkSharpe.toFixed(3)),
    curve: benchmarkCurve,
  };
};

export const summarizeExposure = (result: BacktestResult | BacktestHistoryDetail): ExposureSummary => {
  const { longBarsPct, shortBarsPct, flatBarsPct, longReturnPct, shortReturnPct } = result.portfolio;
  const directionalBias =
    longBarsPct > shortBarsPct + 10
      ? "Long biased"
      : shortBarsPct > longBarsPct + 10
        ? "Short biased"
        : "Balanced";
  return {
    longBarsPct: Number(longBarsPct.toFixed(2)),
    shortBarsPct: Number(shortBarsPct.toFixed(2)),
    flatBarsPct: Number(flatBarsPct.toFixed(2)),
    longReturnPct: Number(longReturnPct.toFixed(2)),
    shortReturnPct: Number(shortReturnPct.toFixed(2)),
    directionalBias,
  };
};

export const buildCompareSnapshot = (detail: BacktestHistoryDetail): CompareSnapshot => {
  const tradeStats = summarizeTradeStats(detail);
  const distribution = summarizeDistribution(detail);
  const benchmark = summarizeBenchmark(detail);
  const exposure = summarizeExposure(detail);
  return {
    id: detail.id,
    label: `${detail.strategy.name} | ${detail.timeframe} | ${detail.symbols.length} symbols`,
    strategyName: detail.strategy.name,
    generatedAt: detail.generatedAt,
    symbolsCount: detail.symbols.length,
    portfolioReturnPct: detail.portfolio.totalReturnPct,
    maxDrawdownPct: detail.portfolio.maxDrawdownPct,
    sharpe: detail.portfolio.sharpe,
    avgStabilityScore: detail.portfolio.avgStabilityScore,
    totalTrades: tradeStats.totalTrades,
    tradeWinRatePct: tradeStats.winRatePct,
    expectancyPct: tradeStats.expectancyPct,
    profitableSymbolsPct: distribution.profitableSymbolsPct,
    medianReturnPct: distribution.medianReturnPct,
    alphaPct: benchmark.alphaPct,
    benchmarkReturnPct: benchmark.benchmarkReturnPct,
    longBarsPct: exposure.longBarsPct,
    shortBarsPct: exposure.shortBarsPct,
    flatBarsPct: exposure.flatBarsPct,
    longReturnPct: exposure.longReturnPct,
    shortReturnPct: exposure.shortReturnPct,
  };
};


