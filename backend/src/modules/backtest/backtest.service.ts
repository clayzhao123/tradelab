import type { Kline, Strategy } from "../../domain/types.js";
import type { BacktestRepository } from "../../repositories/backtest.repository.js";
import type { StrategyRepository } from "../../repositories/strategy.repository.js";
import type { MarketService } from "../market/market.service.js";
import type {
  BacktestFactor,
  BacktestComputedResult,
  BacktestHistoryDetail,
  BacktestHistorySummary,
  BacktestInput,
  BacktestRequestSnapshot,
  BacktestRunResult,
  DecisionMode,
  DecisionThreshold,
  EquityPoint,
  FactorWeights,
  PricePoint,
  SymbolBacktestResult,
  TradeMarker,
} from "./backtest.types.js";
import { notFoundError } from "../../shared/app-error.js";

const DEFAULT_WEIGHTS: FactorWeights = {
  trend: 0.24,
  momentum: 0.22,
  meanReversion: 0.16,
  volatility: 0.14,
  volume: 0.14,
  structure: 0.1,
};

const DEFAULT_DECISION_MODE: DecisionMode = "neutral";
const FALLBACK_THRESHOLD_BY_MODE: Record<DecisionMode, number> = {
  aggressive: 0.16,
  neutral: 0.22,
  conservative: 0.3,
};
const AUTO_THRESHOLD_QUANTILE_BY_MODE: Record<DecisionMode, number> = {
  aggressive: 0.58,
  neutral: 0.7,
  conservative: 0.82,
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const mean = (values: number[]): number => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

const std = (values: number[]): number => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const tanh = (value: number): number => {
  const e2x = Math.exp(2 * value);
  return (e2x - 1) / (e2x + 1);
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

const parseDecisionMode = (raw: unknown): DecisionMode | null => {
  if (raw === "aggressive" || raw === "neutral" || raw === "conservative") {
    return raw;
  }
  return null;
};

const parseTimeframe = (input: string): string => {
  const raw = input.trim();
  if (!raw) return "1d";
  const unit = raw.at(-1);
  const value = raw.slice(0, -1);
  if (!unit || Number.isNaN(Number(value))) {
    return "1d";
  }
  if (unit === "M") return `${value}M`;
  return `${value}${unit.toLowerCase()}`;
};

const periodsPerYear = (timeframe: string): number => {
  const normalized = parseTimeframe(timeframe);
  const match = normalized.match(/^(\d+)([mhdwyM])$/);
  if (!match) return 365;
  const n = Number.parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "m") return (365 * 24 * 60) / n;
  if (unit === "h") return (365 * 24) / n;
  if (unit === "d") return 365 / n;
  if (unit === "w") return 52 / n;
  if (unit === "M") return 12 / n;
  if (unit === "y") return 1 / n;
  return 365;
};

const scoreFromCurve = (curve: number[]): { totalReturnPct: number; maxDrawdownPct: number } => {
  if (curve.length === 0) {
    return { totalReturnPct: 0, maxDrawdownPct: 0 };
  }
  const first = curve[0];
  const last = curve[curve.length - 1];
  const totalReturnPct = ((last - first) / Math.max(1e-9, first)) * 100;
  let peak = curve[0];
  let maxDrawdown = 0;
  for (const equity of curve) {
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? (peak - equity) / peak : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  return {
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
  };
};

const labelToFactor = (label: string): BacktestFactor | null => {
  const normalized = label.toLowerCase();
  if (["trend", "moving-average", "breakout", "lagging"].includes(normalized)) return "trend";
  if (["momentum", "oscillator", "leading"].includes(normalized)) return "momentum";
  if (["mean-reversion", "reversion", "range"].includes(normalized)) return "meanReversion";
  if (["volatility", "risk"].includes(normalized)) return "volatility";
  if (["volume", "order-flow", "liquidity"].includes(normalized)) return "volume";
  if (["market-structure", "support-resistance", "regime"].includes(normalized)) return "structure";
  return null;
};

const normalizedWeights = (weights: Partial<FactorWeights>): FactorWeights => {
  const merged: FactorWeights = {
    trend: weights.trend ?? DEFAULT_WEIGHTS.trend,
    momentum: weights.momentum ?? DEFAULT_WEIGHTS.momentum,
    meanReversion: weights.meanReversion ?? DEFAULT_WEIGHTS.meanReversion,
    volatility: weights.volatility ?? DEFAULT_WEIGHTS.volatility,
    volume: weights.volume ?? DEFAULT_WEIGHTS.volume,
    structure: weights.structure ?? DEFAULT_WEIGHTS.structure,
  };
  const total = Object.values(merged).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return { ...DEFAULT_WEIGHTS };
  }
  return {
    trend: merged.trend / total,
    momentum: merged.momentum / total,
    meanReversion: merged.meanReversion / total,
    volatility: merged.volatility / total,
    volume: merged.volume / total,
    structure: merged.structure / total,
  };
};

const deriveFactorWeightsFromStrategy = (strategy: Strategy | null): FactorWeights => {
  if (!strategy) return { ...DEFAULT_WEIGHTS };
  const params = strategy.params as Record<string, unknown>;
  const fusion = params.fusion as Record<string, unknown> | undefined;
  const indicators = Array.isArray(fusion?.indicators) ? (fusion?.indicators as Array<Record<string, unknown>>) : [];
  if (indicators.length === 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  const aggregated: Partial<FactorWeights> = {};
  for (const item of indicators) {
    const weightRaw = Number(item.weight ?? 0);
    const weight = Number.isFinite(weightRaw) ? Math.max(0, weightRaw) : 0;
    const labels = Array.isArray(item.labels) ? (item.labels as unknown[]).filter((row): row is string => typeof row === "string") : [];
    const family = typeof item.family === "string" ? item.family : "";
    const candidateLabels = [...labels, family];
    const mapped = new Set(candidateLabels.map(labelToFactor).filter((row): row is BacktestFactor => row != null));
    const fallback: BacktestFactor = mapped.size > 0 ? [...mapped][0] : "trend";
    const distributeTo = mapped.size > 0 ? [...mapped] : [fallback];
    const perFactor = weight / distributeTo.length;
    for (const factor of distributeTo) {
      aggregated[factor] = (aggregated[factor] ?? 0) + perFactor;
    }
  }
  return normalizedWeights(aggregated);
};

const deriveDecisionModeFromStrategy = (strategy: Strategy | null): DecisionMode | null => {
  if (!strategy) return null;
  const params = strategy.params as Record<string, unknown>;
  const fusion = params.fusion as Record<string, unknown> | undefined;
  return parseDecisionMode(fusion?.decisionMode);
};

const deriveDecisionThreshold = (
  composites: number[],
  mode: DecisionMode,
): DecisionThreshold => {
  const absComposites = composites
    .map((value) => Math.abs(value))
    .filter((value) => Number.isFinite(value));

  const q = AUTO_THRESHOLD_QUANTILE_BY_MODE[mode];
  if (absComposites.length === 0) {
    const fallback = FALLBACK_THRESHOLD_BY_MODE[mode];
    return {
      mode,
      long: Number(fallback.toFixed(4)),
      short: Number((-fallback).toFixed(4)),
      quantile: q,
      source: "fallback",
      sampleSize: 0,
    };
  }

  const rawThreshold = quantile(absComposites, q);
  const threshold = clamp(rawThreshold, 0.02, 0.95);
  return {
    mode,
    long: Number(threshold.toFixed(4)),
    short: Number((-threshold).toFixed(4)),
    quantile: q,
    source: "auto_composite_quantile",
    sampleSize: absComposites.length,
  };
};

const emaSeries = (values: number[], period: number): number[] => {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
};

type CompositePoint = {
  ts: string;
  close: number;
  prevClose: number;
  composite: number;
};

const buildCompositeSeries = (klinesInput: Kline[], factorWeights: FactorWeights): CompositePoint[] => {
  if (klinesInput.length < 40) {
    return [];
  }
  const klines = [...klinesInput].sort((a, b) => a.openTime.localeCompare(b.openTime));
  const closes = klines.map((row) => row.close);
  const volumes = klines.map((row) => row.volume);
  const highs = klines.map((row) => row.high);
  const lows = klines.map((row) => row.low);
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);

  const out: CompositePoint[] = [];
  for (let i = 30; i < klines.length; i += 1) {
    const close = closes[i];
    const prevClose = closes[i - 1];
    if (prevClose <= 0 || close <= 0) {
      continue;
    }

    const change5 = close / closes[Math.max(0, i - 5)] - 1;
    const trendScore = tanh(((ema12[i] - ema26[i]) / close) * 36);
    const momentumScore = tanh(change5 * 12);

    const window20Start = Math.max(0, i - 20);
    const close20 = closes.slice(window20Start, i + 1);
    const mean20 = mean(close20);
    const std20 = Math.max(1e-9, std(close20));
    const meanReversionScore = -tanh((close - mean20) / (2.2 * std20));

    const trWindow = Array.from({ length: 14 }, (_, offset) => {
      const idx = Math.max(1, i - offset);
      const prev = closes[idx - 1];
      return Math.max(highs[idx] - lows[idx], Math.abs(highs[idx] - prev), Math.abs(lows[idx] - prev));
    });
    const atr14 = mean(trWindow);
    const volPenalty = clamp((atr14 / close) * 18, 0, 1);
    const volatilityScore = 1 - 2 * volPenalty;

    const volume20 = volumes.slice(window20Start, i + 1);
    const volumeRatio = volumes[i] / Math.max(1e-9, mean(volume20));
    const volumeScore = tanh((volumeRatio - 1) * 1.7);

    const high20 = Math.max(...highs.slice(window20Start, i + 1));
    const low20 = Math.min(...lows.slice(window20Start, i + 1));
    const range20 = Math.max(1e-9, high20 - low20);
    const structureScore = tanh(((close - (high20 + low20) / 2) / (range20 / 2)) * 0.9);

    const composite =
      trendScore * factorWeights.trend +
      momentumScore * factorWeights.momentum +
      meanReversionScore * factorWeights.meanReversion +
      volatilityScore * factorWeights.volatility +
      volumeScore * factorWeights.volume +
      structureScore * factorWeights.structure;

    out.push({
      ts: klines[i].closeTime,
      close,
      prevClose,
      composite,
    });
  }
  return out;
};

const simulateSymbol = (
  symbol: string,
  compositeSeries: CompositePoint[],
  decisionThreshold: DecisionThreshold,
  initialCapital: number,
  timeframe: string,
): SymbolBacktestResult | null => {
  if (compositeSeries.length === 0) {
    return null;
  }

  const perYear = periodsPerYear(timeframe);
  const costPerTurn = 0.00055;
  const equityCurve: EquityPoint[] = [];
  const tradeReturnCurve: Array<{ tradeIndex: number; returnPct: number }> = [];
  const priceCurve: PricePoint[] = compositeSeries.map((point) => ({
    ts: point.ts,
    price: Number(point.close.toFixed(4)),
  }));
  const tradeMarkers: TradeMarker[] = [];
  const strategyReturns: number[] = [];

  let equity = initialCapital;
  let position = 0; // -1 short, 0 flat, 1 long
  let trades = 0;
  let activeBars = 0;
  let winningBars = 0;
  let longBars = 0;
  let shortBars = 0;
  let flatBars = 0;
  let longReturnAcc = 0;
  let shortReturnAcc = 0;
  let nextMarkerId = 1;
  let openBuyMarkerIndex: number | null = null;

  for (const point of compositeSeries) {
    let nextPosition = 0;
    if (point.composite >= decisionThreshold.long) nextPosition = 1;
    if (point.composite <= decisionThreshold.short) nextPosition = -1;

    const rawReturn = (point.close / point.prevClose - 1) * position;
    const cost = nextPosition === position ? 0 : Math.abs(nextPosition - position) * costPerTurn;
    const netReturn = rawReturn - cost;

    equity *= 1 + netReturn;
    equity = Math.max(equity, initialCapital * 0.2);
    equityCurve.push({
      ts: point.ts,
      equity: Number(equity.toFixed(2)),
    });
    strategyReturns.push(netReturn);

    if (position > 0) {
      longBars += 1;
      longReturnAcc += netReturn;
    } else if (position < 0) {
      shortBars += 1;
      shortReturnAcc += netReturn;
    } else {
      flatBars += 1;
    }

    if (position !== 0) {
      activeBars += 1;
      if (netReturn > 0) {
        winningBars += 1;
      }
    }

    if (nextPosition !== position) {
      trades += 1;
      tradeReturnCurve.push({
        tradeIndex: trades,
        returnPct: Number((((equity / initialCapital) - 1) * 100).toFixed(2)),
      });

      const enteringLong = nextPosition === 1 && position !== 1;
      const exitingLong = position === 1 && nextPosition !== 1;

      if (enteringLong || exitingLong) {
        const marker: TradeMarker = {
          markerId: nextMarkerId,
          tradeIndex: trades,
          action: enteringLong ? "buy" : "sell",
          ts: point.ts,
          price: Number(point.close.toFixed(4)),
          linkedMarkerId: null,
          linkedTs: null,
          linkedPrice: null,
        };
        nextMarkerId += 1;

        if (enteringLong) {
          openBuyMarkerIndex = tradeMarkers.length;
        } else if (openBuyMarkerIndex != null) {
          const linkedBuy = tradeMarkers[openBuyMarkerIndex];
          linkedBuy.linkedMarkerId = marker.markerId;
          linkedBuy.linkedTs = marker.ts;
          linkedBuy.linkedPrice = marker.price;
          marker.linkedMarkerId = linkedBuy.markerId;
          marker.linkedTs = linkedBuy.ts;
          marker.linkedPrice = linkedBuy.price;
          openBuyMarkerIndex = null;
        }

        tradeMarkers.push(marker);
      }
    }

    position = nextPosition;
  }

  if (equityCurve.length === 0) {
    return null;
  }

  const curveValues = equityCurve.map((row) => row.equity);
  const curveStats = scoreFromCurve(curveValues);
  const returnStd = std(strategyReturns);
  const returnMean = mean(strategyReturns);
  const annualizedVol = returnStd * Math.sqrt(perYear);
  const sharpe = annualizedVol > 0 ? (returnMean / returnStd) * Math.sqrt(perYear) : 0;
  const winRate = activeBars > 0 ? winningBars / activeBars : 0;
  const sharpeNorm = clamp((sharpe + 1.2) / 3.2, 0, 1);
  const drawdownNorm = 1 - clamp(curveStats.maxDrawdownPct / 100, 0, 1);
  const returnNorm = clamp((curveStats.totalReturnPct + 20) / 80, 0, 1);
  const stabilityScore = (sharpeNorm * 0.36 + drawdownNorm * 0.34 + winRate * 0.2 + returnNorm * 0.1) * 100;
  const totalBars = compositeSeries.length || 1;

  return {
    symbol,
    totalReturnPct: curveStats.totalReturnPct,
    maxDrawdownPct: curveStats.maxDrawdownPct,
    winRatePct: Number((winRate * 100).toFixed(2)),
    volatilityPct: Number((annualizedVol * 100).toFixed(2)),
    sharpe: Number(sharpe.toFixed(3)),
    trades,
    stabilityScore: Number(stabilityScore.toFixed(2)),
    longBarsPct: Number(((longBars / totalBars) * 100).toFixed(2)),
    shortBarsPct: Number(((shortBars / totalBars) * 100).toFixed(2)),
    flatBarsPct: Number(((flatBars / totalBars) * 100).toFixed(2)),
    longReturnPct: Number((longReturnAcc * 100).toFixed(2)),
    shortReturnPct: Number((shortReturnAcc * 100).toFixed(2)),
    tradeReturnCurve,
    equityCurve,
    priceCurve,
    tradeMarkers,
  };
};

const combinePortfolioCurve = (results: SymbolBacktestResult[]): EquityPoint[] => {
  if (results.length === 0) return [];
  const minLength = Math.min(...results.map((row) => row.equityCurve.length));
  if (minLength <= 0) return [];
  const aligned = results.map((row) => row.equityCurve.slice(-minLength));
  return Array.from({ length: minLength }, (_, idx) => {
    const equity = mean(aligned.map((curve) => curve[idx].equity));
    return {
      ts: aligned[0][idx].ts,
      equity: Number(equity.toFixed(2)),
    };
  });
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  const limit = Math.max(1, Math.floor(concurrency));
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export class BacktestService {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly backtestRepository: BacktestRepository,
    private readonly marketService: MarketService,
  ) {}

  async run(input: BacktestInput): Promise<BacktestRunResult> {
    const requestedMode = parseDecisionMode(input.decisionMode) ?? DEFAULT_DECISION_MODE;
    const symbols = [...new Set(input.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].slice(0, 100);
    const timeframe = parseTimeframe(input.timeframe);
    const lookbackBars = Math.max(24, Math.min(2000, Math.floor(input.lookbackBars)));
    const initialCapital = Math.max(100, input.initialCapital);

    const strategy = input.strategyId
      ? await this.strategyRepository.getById(input.strategyId)
      : null;
    const factorWeights = deriveFactorWeightsFromStrategy(strategy);
    const strategyMode = deriveDecisionModeFromStrategy(strategy);
    const decisionMode = parseDecisionMode(input.decisionMode) ?? strategyMode ?? DEFAULT_DECISION_MODE;

    const requestSnapshot: BacktestRequestSnapshot = {
      strategyId: strategy?.id ?? null,
      symbols,
      timeframe,
      lookbackBars,
      initialCapital,
      decisionMode,
    };

    let computed: BacktestComputedResult;
    if (symbols.length === 0) {
      computed = {
        generatedAt: new Date().toISOString(),
        strategy: {
          id: null,
          name: "Custom",
          params: {},
          factorWeights: { ...DEFAULT_WEIGHTS },
          decisionThreshold: deriveDecisionThreshold([], requestedMode),
        },
        timeframe: parseTimeframe(input.timeframe),
        lookbackBars: input.lookbackBars,
        initialCapital: input.initialCapital,
        symbols: [],
        results: [],
        portfolio: {
          totalReturnPct: 0,
          maxDrawdownPct: 0,
          winRatePct: 0,
          volatilityPct: 0,
          sharpe: 0,
          avgStabilityScore: 0,
          longBarsPct: 0,
          shortBarsPct: 0,
          flatBarsPct: 0,
          longReturnPct: 0,
          shortReturnPct: 0,
          bestSymbol: null,
          worstSymbol: null,
          equityCurve: [],
        },
      };
      const saved = await this.backtestRepository.save({
        result: computed,
        requestSnapshot: {
          ...requestSnapshot,
          symbols: [],
        },
      });
      return {
        ...computed,
        backtestRunId: saved.id,
      };
    }

    const symbolKlines = await mapWithConcurrency(symbols, 8, async (symbol) => {
      const klines = await this.marketService.getKlines({
        symbol,
        timeframe,
        limit: lookbackBars,
      });
      return { symbol, klines } as const;
    });
    const compositeBySymbol = new Map<string, CompositePoint[]>();
    for (const row of symbolKlines) {
      compositeBySymbol.set(row.symbol, buildCompositeSeries(row.klines, factorWeights));
    }
    const allComposites = [...compositeBySymbol.values()].flatMap((rows) => rows.map((point) => point.composite));
    const decisionThreshold = deriveDecisionThreshold(allComposites, decisionMode);

    const perSymbolResults = symbols.map((symbol) =>
      simulateSymbol(symbol, compositeBySymbol.get(symbol) ?? [], decisionThreshold, initialCapital, timeframe),
    );
    const results = perSymbolResults.filter((row): row is SymbolBacktestResult => row != null);
    const portfolioCurve = combinePortfolioCurve(results);
    const portfolioStats = scoreFromCurve(portfolioCurve.map((row) => row.equity));
    const sharpe = (() => {
      if (portfolioCurve.length < 2) return 0;
      const returns = portfolioCurve.slice(1).map((point, idx) => {
        const prev = portfolioCurve[idx].equity;
        return prev > 0 ? point.equity / prev - 1 : 0;
      });
      const sigma = std(returns);
      if (sigma <= 0) return 0;
      return (mean(returns) / sigma) * Math.sqrt(periodsPerYear(timeframe));
    })();
    const avgWinRate =
      results.length > 0 ? mean(results.map((row) => row.winRatePct)) : 0;
    const avgVolatility =
      results.length > 0 ? mean(results.map((row) => row.volatilityPct)) : 0;
    const avgStability =
      results.length > 0 ? mean(results.map((row) => row.stabilityScore)) : 0;
    const avgLongBarsPct =
      results.length > 0 ? mean(results.map((row) => row.longBarsPct)) : 0;
    const avgShortBarsPct =
      results.length > 0 ? mean(results.map((row) => row.shortBarsPct)) : 0;
    const avgFlatBarsPct =
      results.length > 0 ? mean(results.map((row) => row.flatBarsPct)) : 0;
    const avgLongReturnPct =
      results.length > 0 ? mean(results.map((row) => row.longReturnPct)) : 0;
    const avgShortReturnPct =
      results.length > 0 ? mean(results.map((row) => row.shortReturnPct)) : 0;
    const sortedByReturn = [...results].sort((a, b) => b.totalReturnPct - a.totalReturnPct);

    computed = {
      generatedAt: new Date().toISOString(),
      strategy: {
        id: strategy?.id ?? null,
        name: strategy?.name ?? "Custom Weighted Fusion",
        params: strategy?.params ?? {},
        factorWeights,
        decisionThreshold,
      },
      timeframe,
      lookbackBars,
      initialCapital,
      symbols,
      results: sortedByReturn,
      portfolio: {
        totalReturnPct: portfolioStats.totalReturnPct,
        maxDrawdownPct: portfolioStats.maxDrawdownPct,
        winRatePct: Number(avgWinRate.toFixed(2)),
        volatilityPct: Number(avgVolatility.toFixed(2)),
        sharpe: Number(sharpe.toFixed(3)),
        avgStabilityScore: Number(avgStability.toFixed(2)),
        longBarsPct: Number(avgLongBarsPct.toFixed(2)),
        shortBarsPct: Number(avgShortBarsPct.toFixed(2)),
        flatBarsPct: Number(avgFlatBarsPct.toFixed(2)),
        longReturnPct: Number(avgLongReturnPct.toFixed(2)),
        shortReturnPct: Number(avgShortReturnPct.toFixed(2)),
        bestSymbol: sortedByReturn[0]?.symbol ?? null,
        worstSymbol: sortedByReturn[sortedByReturn.length - 1]?.symbol ?? null,
        equityCurve: portfolioCurve,
      },
    };

    const saved = await this.backtestRepository.save({
      result: computed,
      requestSnapshot,
    });

    return {
      ...computed,
      backtestRunId: saved.id,
    };
  }

  async listHistory(limit = 50): Promise<BacktestHistorySummary[]> {
    return this.backtestRepository.listSummaries(limit);
  }

  async getHistoryDetail(id: string): Promise<BacktestHistoryDetail | null> {
    return this.backtestRepository.getDetail(id);
  }

  async deleteHistory(id: string): Promise<void> {
    const removed = await this.backtestRepository.remove(id);
    if (!removed) {
      throw notFoundError("not_found.backtest_history", `Backtest history ${id} does not exist`, {
        backtestRunId: id,
      });
    }
  }
}

export type { BacktestRunResult, SymbolBacktestResult };
