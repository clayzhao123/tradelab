import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PostgresClient } from "../db/postgres-client.js";
import type {
  BacktestComputedResult,
  BacktestHistoryDetail,
  BacktestHistorySummary,
  BacktestRequestSnapshot,
  SymbolBacktestResult,
  TradeMarker,
} from "../modules/backtest/backtest.types.js";

export interface BacktestRepository {
  save(input: { result: BacktestComputedResult; requestSnapshot: BacktestRequestSnapshot }): Promise<{ id: string }>;
  listSummaries(limit: number): Promise<BacktestHistorySummary[]>;
  getDetail(id: string): Promise<BacktestHistoryDetail | null>;
  remove(id: string): Promise<boolean>;
}

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toInteger = (value: unknown, fallback = 0): number => Math.trunc(toNumber(value, fallback));

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((row): row is string => typeof row === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((row): row is string => typeof row === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeTradeMarker = (value: unknown): TradeMarker => {
  const row = value && typeof value === "object" ? (value as Partial<TradeMarker>) : {};
  return {
    markerId: toInteger(row.markerId),
    tradeIndex: toInteger(row.tradeIndex),
    action: row.action === "sell" ? "sell" : "buy",
    ts: toIso(row.ts),
    price: toNumber(row.price),
    linkedMarkerId: row.linkedMarkerId == null ? null : toInteger(row.linkedMarkerId),
    linkedTs: row.linkedTs == null ? null : toIso(row.linkedTs),
    linkedPrice: row.linkedPrice == null ? null : toNumber(row.linkedPrice),
  };
};

const normalizeSymbolBacktestResult = (value: unknown): SymbolBacktestResult => {
  const row = value && typeof value === "object" ? (value as Partial<SymbolBacktestResult>) : {};
  return {
    symbol: typeof row.symbol === "string" ? row.symbol : "",
    totalReturnPct: toNumber(row.totalReturnPct),
    maxDrawdownPct: toNumber(row.maxDrawdownPct),
    winRatePct: toNumber(row.winRatePct),
    volatilityPct: toNumber(row.volatilityPct),
    sharpe: toNumber(row.sharpe),
    trades: toInteger(row.trades),
    stabilityScore: toNumber(row.stabilityScore),
    longBarsPct: toNumber(row.longBarsPct),
    shortBarsPct: toNumber(row.shortBarsPct),
    flatBarsPct: toNumber(row.flatBarsPct),
    longReturnPct: toNumber(row.longReturnPct),
    shortReturnPct: toNumber(row.shortReturnPct),
    tradeReturnCurve: Array.isArray(row.tradeReturnCurve)
      ? row.tradeReturnCurve.map((point) => ({
          tradeIndex: toInteger((point as { tradeIndex?: unknown }).tradeIndex),
          returnPct: toNumber((point as { returnPct?: unknown }).returnPct),
        }))
      : [],
    equityCurve: Array.isArray(row.equityCurve)
      ? row.equityCurve.map((point) => ({
          ts: toIso((point as { ts?: unknown }).ts),
          equity: toNumber((point as { equity?: unknown }).equity),
        }))
      : [],
    priceCurve: Array.isArray(row.priceCurve)
      ? row.priceCurve.map((point) => ({
          ts: toIso((point as { ts?: unknown }).ts),
          price: toNumber((point as { price?: unknown }).price),
        }))
      : [],
    tradeMarkers: Array.isArray(row.tradeMarkers) ? row.tradeMarkers.map((marker) => normalizeTradeMarker(marker)) : [],
  };
};

const normalizeBacktestComputedResult = (value: unknown): BacktestComputedResult => {
  const row = value && typeof value === "object" ? (value as Partial<BacktestComputedResult>) : {};
  const strategy =
    row.strategy && typeof row.strategy === "object"
      ? (row.strategy as Partial<BacktestComputedResult["strategy"]>)
      : ({} as Partial<BacktestComputedResult["strategy"]>);
  const factorWeights =
    strategy.factorWeights && typeof strategy.factorWeights === "object"
      ? (strategy.factorWeights as Partial<BacktestComputedResult["strategy"]["factorWeights"]>)
      : ({} as Partial<BacktestComputedResult["strategy"]["factorWeights"]>);
  const decisionThreshold =
    strategy.decisionThreshold && typeof strategy.decisionThreshold === "object"
      ? (strategy.decisionThreshold as Partial<BacktestComputedResult["strategy"]["decisionThreshold"]>)
      : ({} as Partial<BacktestComputedResult["strategy"]["decisionThreshold"]>);
  const results = Array.isArray(row.results) ? row.results.map((item) => normalizeSymbolBacktestResult(item)) : [];
  const portfolio =
    row.portfolio && typeof row.portfolio === "object"
      ? (row.portfolio as Partial<BacktestComputedResult["portfolio"]>)
      : ({} as Partial<BacktestComputedResult["portfolio"]>);

  return {
    generatedAt: toIso(row.generatedAt),
    strategy: {
      id: typeof strategy.id === "string" ? strategy.id : null,
      name: typeof strategy.name === "string" && strategy.name ? strategy.name : "Custom Weighted Fusion",
      params: strategy.params && typeof strategy.params === "object" ? (strategy.params as Record<string, unknown>) : {},
      factorWeights: {
        trend: toNumber(factorWeights.trend),
        momentum: toNumber(factorWeights.momentum),
        meanReversion: toNumber(factorWeights.meanReversion),
        volatility: toNumber(factorWeights.volatility),
        volume: toNumber(factorWeights.volume),
        structure: toNumber(factorWeights.structure),
      },
      decisionThreshold: {
        mode:
          decisionThreshold.mode === "aggressive" ||
          decisionThreshold.mode === "neutral" ||
          decisionThreshold.mode === "conservative"
            ? decisionThreshold.mode
            : "neutral",
        long: toNumber(decisionThreshold.long),
        short: toNumber(decisionThreshold.short),
        quantile: toNumber(decisionThreshold.quantile),
        source: decisionThreshold.source === "fallback" ? "fallback" : "auto_composite_quantile",
        sampleSize: toInteger(decisionThreshold.sampleSize),
      },
    },
    timeframe: typeof row.timeframe === "string" && row.timeframe ? row.timeframe : "1d",
    lookbackBars: toInteger(row.lookbackBars, 365),
    initialCapital: toNumber(row.initialCapital, 10000),
    symbols: parseStringArray(row.symbols).length > 0 ? parseStringArray(row.symbols) : results.map((item) => item.symbol).filter(Boolean),
    results,
    portfolio: {
      totalReturnPct: toNumber(portfolio.totalReturnPct),
      maxDrawdownPct: toNumber(portfolio.maxDrawdownPct),
      winRatePct: toNumber(portfolio.winRatePct),
      volatilityPct: toNumber(portfolio.volatilityPct),
      sharpe: toNumber(portfolio.sharpe),
      avgStabilityScore: toNumber(portfolio.avgStabilityScore),
      longBarsPct: toNumber(portfolio.longBarsPct),
      shortBarsPct: toNumber(portfolio.shortBarsPct),
      flatBarsPct: toNumber(portfolio.flatBarsPct),
      longReturnPct: toNumber(portfolio.longReturnPct),
      shortReturnPct: toNumber(portfolio.shortReturnPct),
      bestSymbol: typeof portfolio.bestSymbol === "string" ? portfolio.bestSymbol : null,
      worstSymbol: typeof portfolio.worstSymbol === "string" ? portfolio.worstSymbol : null,
      equityCurve: Array.isArray(portfolio.equityCurve)
        ? portfolio.equityCurve.map((point: { ts?: unknown; equity?: unknown }) => ({
            ts: toIso((point as { ts?: unknown }).ts),
            equity: toNumber((point as { equity?: unknown }).equity),
          }))
        : [],
    },
  };
};

const normalizeRequestSnapshot = (value: unknown, fallback: BacktestComputedResult): BacktestRequestSnapshot => {
  const row = value && typeof value === "object" ? (value as Partial<BacktestRequestSnapshot>) : {};
  return {
    strategyId: typeof row.strategyId === "string" ? row.strategyId : fallback.strategy.id,
    symbols: parseStringArray(row.symbols).length > 0 ? parseStringArray(row.symbols) : fallback.symbols,
    timeframe: typeof row.timeframe === "string" && row.timeframe ? row.timeframe : fallback.timeframe,
    lookbackBars: toInteger(row.lookbackBars, fallback.lookbackBars),
    initialCapital: toNumber(row.initialCapital, fallback.initialCapital),
    decisionMode:
      row.decisionMode === "aggressive" || row.decisionMode === "neutral" || row.decisionMode === "conservative"
        ? row.decisionMode
        : fallback.strategy.decisionThreshold.mode,
  };
};

export class MemoryBacktestRepository implements BacktestRepository {
  private readonly runs = new Map<
    string,
    {
      result: BacktestComputedResult;
      requestSnapshot: BacktestRequestSnapshot;
    }
  >();

  async save(input: { result: BacktestComputedResult; requestSnapshot: BacktestRequestSnapshot }): Promise<{ id: string }> {
    const id = randomUUID();
    this.runs.set(id, {
      result: structuredClone(input.result),
      requestSnapshot: structuredClone(input.requestSnapshot),
    });
    return { id };
  }

  async listSummaries(limit: number): Promise<BacktestHistorySummary[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const rows = [...this.runs.entries()]
      .map(([id, value]) => ({
        id,
        generatedAt: value.result.generatedAt,
        strategyId: value.result.strategy.id,
        strategyName: value.result.strategy.name,
        timeframe: value.result.timeframe,
        lookbackBars: value.result.lookbackBars,
        initialCapital: value.result.initialCapital,
        symbolsCount: value.result.results.length,
        portfolio: {
          totalReturnPct: value.result.portfolio.totalReturnPct,
          maxDrawdownPct: value.result.portfolio.maxDrawdownPct,
          sharpe: value.result.portfolio.sharpe,
        },
      }))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, safeLimit);
    return rows;
  }

  async getDetail(id: string): Promise<BacktestHistoryDetail | null> {
    const row = this.runs.get(id);
    if (!row) {
      return null;
    }
    return {
      id,
      backtestRunId: id,
      requestSnapshot: structuredClone(row.requestSnapshot),
      ...structuredClone(row.result),
    };
  }

  async remove(id: string): Promise<boolean> {
    return this.runs.delete(id);
  }
}

type FileBacktestRow = {
  id: string;
  result: BacktestComputedResult;
  requestSnapshot: BacktestRequestSnapshot;
};

const readBacktestFile = async (filePath: string): Promise<FileBacktestRow[]> => {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((row): row is Partial<FileBacktestRow> => Boolean(row && typeof row === "object"))
      .map((row) => {
        const result = normalizeBacktestComputedResult(structuredClone(row.result ?? {}));
        return {
          id: typeof row.id === "string" && row.id ? row.id : randomUUID(),
          result,
          requestSnapshot: normalizeRequestSnapshot(structuredClone(row.requestSnapshot ?? {}), result),
        };
      });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    return [];
  }
};

const writeBacktestFile = async (filePath: string, rows: FileBacktestRow[]): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(rows, null, 2), "utf8");
};

export class FileBacktestRepository implements BacktestRepository {
  constructor(private readonly filePath: string) {}

  async save(input: { result: BacktestComputedResult; requestSnapshot: BacktestRequestSnapshot }): Promise<{ id: string }> {
    const rows = await readBacktestFile(this.filePath);
    const id = randomUUID();
    rows.unshift({
      id,
      result: structuredClone(input.result),
      requestSnapshot: structuredClone(input.requestSnapshot),
    });
    await writeBacktestFile(this.filePath, rows);
    return { id };
  }

  async listSummaries(limit: number): Promise<BacktestHistorySummary[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const rows = await readBacktestFile(this.filePath);
    return rows
      .map((row) => ({
        id: row.id,
        generatedAt: row.result.generatedAt,
        strategyId: row.result.strategy.id,
        strategyName: row.result.strategy.name,
        timeframe: row.result.timeframe,
        lookbackBars: row.result.lookbackBars,
        initialCapital: row.result.initialCapital,
        symbolsCount: row.result.results.length,
        portfolio: {
          totalReturnPct: row.result.portfolio.totalReturnPct,
          maxDrawdownPct: row.result.portfolio.maxDrawdownPct,
          sharpe: row.result.portfolio.sharpe,
        },
      }))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, safeLimit);
  }

  async getDetail(id: string): Promise<BacktestHistoryDetail | null> {
    const rows = await readBacktestFile(this.filePath);
    const row = rows.find((item) => item.id === id);
    if (!row) {
      return null;
    }
    return {
      id,
      backtestRunId: id,
      requestSnapshot: structuredClone(row.requestSnapshot),
      ...structuredClone(row.result),
    };
  }

  async remove(id: string): Promise<boolean> {
    const rows = await readBacktestFile(this.filePath);
    const next = rows.filter((row) => row.id !== id);
    if (next.length === rows.length) {
      return false;
    }
    await writeBacktestFile(this.filePath, next);
    return true;
  }
}

type BacktestRunMainRow = {
  id: string;
  strategyId: string | null;
  strategyName: string | null;
  strategyParams: unknown;
  factorWeights: unknown;
  decisionThreshold: unknown;
  timeframe: string;
  lookbackBars: unknown;
  initialCapital: unknown;
  symbols: unknown;
  generatedAt: unknown;
  requestSnapshot: unknown;
  portfolioTotalReturnPct: unknown;
  portfolioMaxDrawdownPct: unknown;
  portfolioWinRatePct: unknown;
  portfolioVolatilityPct: unknown;
  portfolioSharpe: unknown;
  portfolioAvgStabilityScore: unknown;
  portfolioLongBarsPct: unknown;
  portfolioShortBarsPct: unknown;
  portfolioFlatBarsPct: unknown;
  portfolioLongReturnPct: unknown;
  portfolioShortReturnPct: unknown;
  portfolioBestSymbol: string | null;
  portfolioWorstSymbol: string | null;
};

type BacktestSummaryRow = {
  id: string;
  generatedAt: unknown;
  strategyId: string | null;
  strategyName: string | null;
  timeframe: string;
  lookbackBars: unknown;
  initialCapital: unknown;
  symbolsCount: unknown;
  portfolioTotalReturnPct: unknown;
  portfolioMaxDrawdownPct: unknown;
  portfolioSharpe: unknown;
};

type SymbolResultRow = {
  symbol: string;
  totalReturnPct: unknown;
  maxDrawdownPct: unknown;
  winRatePct: unknown;
  volatilityPct: unknown;
  sharpe: unknown;
  trades: unknown;
  stabilityScore: unknown;
  longBarsPct: unknown;
  shortBarsPct: unknown;
  flatBarsPct: unknown;
  longReturnPct: unknown;
  shortReturnPct: unknown;
};

type PortfolioPointRow = {
  ts: unknown;
  equity: unknown;
};

type PricePointRow = {
  symbol: string;
  ts: unknown;
  price: unknown;
};

type TradeReturnPointRow = {
  symbol: string;
  tradeIndex: unknown;
  returnPct: unknown;
};

type TradeMarkerRow = {
  symbol: string;
  markerId: unknown;
  tradeIndex: unknown;
  action: string;
  ts: unknown;
  price: unknown;
  linkedMarkerId: unknown;
  linkedTs: unknown;
  linkedPrice: unknown;
};

export class PostgresBacktestRepository implements BacktestRepository {
  constructor(private readonly pg: PostgresClient) {}

  async save(input: { result: BacktestComputedResult; requestSnapshot: BacktestRequestSnapshot }): Promise<{ id: string }> {
    const { result, requestSnapshot } = input;
    const saved = await this.pg.withTransaction(async (tx) => {
      const runInsert = await tx.query<{ id: string }>(
        `INSERT INTO backtest_runs (
          strategy_id,
          strategy_name,
          strategy_params,
          factor_weights,
          decision_threshold,
          timeframe,
          lookback_bars,
          initial_capital,
          symbols,
          symbols_count,
          portfolio_total_return_pct,
          portfolio_max_drawdown_pct,
          portfolio_win_rate_pct,
          portfolio_volatility_pct,
          portfolio_sharpe,
          portfolio_avg_stability_score,
          portfolio_long_bars_pct,
          portfolio_short_bars_pct,
          portfolio_flat_bars_pct,
          portfolio_long_return_pct,
          portfolio_short_return_pct,
          portfolio_best_symbol,
          portfolio_worst_symbol,
          generated_at,
          request_snapshot
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5::jsonb,
          $6,
          $7,
          $8,
          $9::text[],
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18,
          $19,
          $20,
          $21,
          $22,
          $23,
          $24::timestamptz,
          $25::jsonb
        )
        RETURNING id`,
        [
          result.strategy.id,
          result.strategy.name,
          JSON.stringify(result.strategy.params ?? {}),
          JSON.stringify(result.strategy.factorWeights),
          JSON.stringify(result.strategy.decisionThreshold),
          result.timeframe,
          result.lookbackBars,
          result.initialCapital,
          result.symbols,
          result.results.length,
          result.portfolio.totalReturnPct,
          result.portfolio.maxDrawdownPct,
          result.portfolio.winRatePct,
          result.portfolio.volatilityPct,
          result.portfolio.sharpe,
          result.portfolio.avgStabilityScore,
          result.portfolio.longBarsPct,
          result.portfolio.shortBarsPct,
          result.portfolio.flatBarsPct,
          result.portfolio.longReturnPct,
          result.portfolio.shortReturnPct,
          result.portfolio.bestSymbol,
          result.portfolio.worstSymbol,
          result.generatedAt,
          JSON.stringify(requestSnapshot),
        ],
      );

      const runId = runInsert.rows[0]?.id;
      if (!runId) {
        throw new Error("backtest_run_insert_failed");
      }

      for (const row of result.results) {
        await tx.query(
          `INSERT INTO backtest_symbol_results (
            run_id,
            symbol,
            total_return_pct,
            max_drawdown_pct,
            win_rate_pct,
            volatility_pct,
            sharpe,
            trades,
            stability_score,
            long_bars_pct,
            short_bars_pct,
            flat_bars_pct,
            long_return_pct,
            short_return_pct
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            runId,
            row.symbol,
            row.totalReturnPct,
            row.maxDrawdownPct,
            row.winRatePct,
            row.volatilityPct,
            row.sharpe,
            row.trades,
            row.stabilityScore,
            row.longBarsPct,
            row.shortBarsPct,
            row.flatBarsPct,
            row.longReturnPct,
            row.shortReturnPct,
          ],
        );
      }

      for (let i = 0; i < result.portfolio.equityCurve.length; i += 1) {
        const point = result.portfolio.equityCurve[i];
        await tx.query(
          `INSERT INTO backtest_portfolio_points (run_id, seq, ts, equity)
          VALUES ($1, $2, $3::timestamptz, $4)`,
          [runId, i + 1, point.ts, point.equity],
        );
      }

      for (const symbolRow of result.results) {
        for (let i = 0; i < symbolRow.priceCurve.length; i += 1) {
          const point = symbolRow.priceCurve[i];
          await tx.query(
            `INSERT INTO backtest_symbol_price_points (run_id, symbol, seq, ts, price)
            VALUES ($1, $2, $3, $4::timestamptz, $5)`,
            [runId, symbolRow.symbol, i + 1, point.ts, point.price],
          );
        }

        for (const point of symbolRow.tradeReturnCurve) {
          await tx.query(
            `INSERT INTO backtest_symbol_trade_return_points (run_id, symbol, trade_index, return_pct)
            VALUES ($1, $2, $3, $4)`,
            [runId, symbolRow.symbol, point.tradeIndex, point.returnPct],
          );
        }

        for (const marker of symbolRow.tradeMarkers) {
          await tx.query(
            `INSERT INTO backtest_symbol_trade_markers (
              run_id,
              symbol,
              marker_id,
              trade_index,
              action,
              ts,
              price,
              linked_marker_id,
              linked_ts,
              linked_price
            )
            VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9::timestamptz, $10)`,
            [
              runId,
              symbolRow.symbol,
              marker.markerId,
              marker.tradeIndex,
              marker.action,
              marker.ts,
              marker.price,
              marker.linkedMarkerId,
              marker.linkedTs,
              marker.linkedPrice,
            ],
          );
        }
      }

      return { id: runId };
    });

    return saved;
  }

  async listSummaries(limit: number): Promise<BacktestHistorySummary[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const rows = await this.pg.query<BacktestSummaryRow>(
      `SELECT
        id,
        generated_at AS "generatedAt",
        strategy_id AS "strategyId",
        strategy_name AS "strategyName",
        timeframe,
        lookback_bars AS "lookbackBars",
        initial_capital AS "initialCapital",
        symbols_count AS "symbolsCount",
        portfolio_total_return_pct AS "portfolioTotalReturnPct",
        portfolio_max_drawdown_pct AS "portfolioMaxDrawdownPct",
        portfolio_sharpe AS "portfolioSharpe"
      FROM backtest_runs
      ORDER BY generated_at DESC
      LIMIT $1`,
      [safeLimit],
    );

    return rows.rows.map((row) => ({
      id: row.id,
      generatedAt: toIso(row.generatedAt),
      strategyId: row.strategyId,
      strategyName: row.strategyName,
      timeframe: row.timeframe,
      lookbackBars: toInteger(row.lookbackBars),
      initialCapital: toNumber(row.initialCapital),
      symbolsCount: toInteger(row.symbolsCount),
      portfolio: {
        totalReturnPct: toNumber(row.portfolioTotalReturnPct),
        maxDrawdownPct: toNumber(row.portfolioMaxDrawdownPct),
        sharpe: toNumber(row.portfolioSharpe),
      },
    }));
  }

  async getDetail(id: string): Promise<BacktestHistoryDetail | null> {
    const main = await this.pg.query<BacktestRunMainRow>(
      `SELECT
        id,
        strategy_id AS "strategyId",
        strategy_name AS "strategyName",
        strategy_params AS "strategyParams",
        factor_weights AS "factorWeights",
        decision_threshold AS "decisionThreshold",
        timeframe,
        lookback_bars AS "lookbackBars",
        initial_capital AS "initialCapital",
        symbols,
        generated_at AS "generatedAt",
        request_snapshot AS "requestSnapshot",
        portfolio_total_return_pct AS "portfolioTotalReturnPct",
        portfolio_max_drawdown_pct AS "portfolioMaxDrawdownPct",
        portfolio_win_rate_pct AS "portfolioWinRatePct",
        portfolio_volatility_pct AS "portfolioVolatilityPct",
        portfolio_sharpe AS "portfolioSharpe",
        portfolio_avg_stability_score AS "portfolioAvgStabilityScore",
        portfolio_long_bars_pct AS "portfolioLongBarsPct",
        portfolio_short_bars_pct AS "portfolioShortBarsPct",
        portfolio_flat_bars_pct AS "portfolioFlatBarsPct",
        portfolio_long_return_pct AS "portfolioLongReturnPct",
        portfolio_short_return_pct AS "portfolioShortReturnPct",
        portfolio_best_symbol AS "portfolioBestSymbol",
        portfolio_worst_symbol AS "portfolioWorstSymbol"
      FROM backtest_runs
      WHERE id = $1
      LIMIT 1`,
      [id],
    );
    if (!main.rows[0]) {
      return null;
    }
    const run = main.rows[0];

    const [symbolRows, portfolioRows, priceRows, tradeReturnRows, markerRows] = await Promise.all([
      this.pg.query<SymbolResultRow>(
        `SELECT
          symbol,
          total_return_pct AS "totalReturnPct",
          max_drawdown_pct AS "maxDrawdownPct",
          win_rate_pct AS "winRatePct",
          volatility_pct AS "volatilityPct",
          sharpe,
          trades,
          stability_score AS "stabilityScore",
          long_bars_pct AS "longBarsPct",
          short_bars_pct AS "shortBarsPct",
          flat_bars_pct AS "flatBarsPct",
          long_return_pct AS "longReturnPct",
          short_return_pct AS "shortReturnPct"
        FROM backtest_symbol_results
        WHERE run_id = $1
        ORDER BY total_return_pct DESC`,
        [id],
      ),
      this.pg.query<PortfolioPointRow>(
        `SELECT ts, equity
        FROM backtest_portfolio_points
        WHERE run_id = $1
        ORDER BY seq ASC`,
        [id],
      ),
      this.pg.query<PricePointRow>(
        `SELECT symbol, ts, price
        FROM backtest_symbol_price_points
        WHERE run_id = $1
        ORDER BY symbol ASC, seq ASC`,
        [id],
      ),
      this.pg.query<TradeReturnPointRow>(
        `SELECT symbol, trade_index AS "tradeIndex", return_pct AS "returnPct"
        FROM backtest_symbol_trade_return_points
        WHERE run_id = $1
        ORDER BY symbol ASC, trade_index ASC`,
        [id],
      ),
      this.pg.query<TradeMarkerRow>(
        `SELECT
          symbol,
          marker_id AS "markerId",
          trade_index AS "tradeIndex",
          action,
          ts,
          price,
          linked_marker_id AS "linkedMarkerId",
          linked_ts AS "linkedTs",
          linked_price AS "linkedPrice"
        FROM backtest_symbol_trade_markers
        WHERE run_id = $1
        ORDER BY symbol ASC, marker_id ASC`,
        [id],
      ),
    ]);

    const priceCurveBySymbol = new Map<string, Array<{ ts: string; price: number }>>();
    for (const row of priceRows.rows) {
      const existing = priceCurveBySymbol.get(row.symbol) ?? [];
      existing.push({
        ts: toIso(row.ts),
        price: toNumber(row.price),
      });
      priceCurveBySymbol.set(row.symbol, existing);
    }

    const tradeReturnBySymbol = new Map<string, Array<{ tradeIndex: number; returnPct: number }>>();
    for (const row of tradeReturnRows.rows) {
      const existing = tradeReturnBySymbol.get(row.symbol) ?? [];
      existing.push({
        tradeIndex: toInteger(row.tradeIndex),
        returnPct: toNumber(row.returnPct),
      });
      tradeReturnBySymbol.set(row.symbol, existing);
    }

    const markerBySymbol = new Map<string, TradeMarker[]>();
    for (const row of markerRows.rows) {
      const existing = markerBySymbol.get(row.symbol) ?? [];
      existing.push({
        markerId: toInteger(row.markerId),
        tradeIndex: toInteger(row.tradeIndex),
        action: row.action === "sell" ? "sell" : "buy",
        ts: toIso(row.ts),
        price: toNumber(row.price),
        linkedMarkerId: row.linkedMarkerId == null ? null : toInteger(row.linkedMarkerId),
        linkedTs: row.linkedTs == null ? null : toIso(row.linkedTs),
        linkedPrice: row.linkedPrice == null ? null : toNumber(row.linkedPrice),
      });
      markerBySymbol.set(row.symbol, existing);
    }

    const results: SymbolBacktestResult[] = symbolRows.rows.map((row) => ({
      symbol: row.symbol,
      totalReturnPct: toNumber(row.totalReturnPct),
      maxDrawdownPct: toNumber(row.maxDrawdownPct),
      winRatePct: toNumber(row.winRatePct),
      volatilityPct: toNumber(row.volatilityPct),
      sharpe: toNumber(row.sharpe),
      trades: toInteger(row.trades),
      stabilityScore: toNumber(row.stabilityScore),
      longBarsPct: toNumber(row.longBarsPct),
      shortBarsPct: toNumber(row.shortBarsPct),
      flatBarsPct: toNumber(row.flatBarsPct),
      longReturnPct: toNumber(row.longReturnPct),
      shortReturnPct: toNumber(row.shortReturnPct),
      tradeReturnCurve: tradeReturnBySymbol.get(row.symbol) ?? [],
      equityCurve: [],
      priceCurve: priceCurveBySymbol.get(row.symbol) ?? [],
      tradeMarkers: markerBySymbol.get(row.symbol) ?? [],
    }));

    const generatedAt = toIso(run.generatedAt);
    const requestSnapshotRaw = parseJsonObject(run.requestSnapshot);
    const requestSnapshot: BacktestRequestSnapshot = {
      strategyId: typeof requestSnapshotRaw.strategyId === "string" ? requestSnapshotRaw.strategyId : null,
      symbols:
        parseStringArray(requestSnapshotRaw.symbols).length > 0
          ? parseStringArray(requestSnapshotRaw.symbols)
          : parseStringArray(run.symbols),
      timeframe:
        typeof requestSnapshotRaw.timeframe === "string" && requestSnapshotRaw.timeframe
          ? requestSnapshotRaw.timeframe
          : run.timeframe,
      lookbackBars: toInteger(requestSnapshotRaw.lookbackBars, toInteger(run.lookbackBars)),
      initialCapital: toNumber(requestSnapshotRaw.initialCapital, toNumber(run.initialCapital)),
      decisionMode:
        requestSnapshotRaw.decisionMode === "aggressive" ||
        requestSnapshotRaw.decisionMode === "neutral" ||
        requestSnapshotRaw.decisionMode === "conservative"
          ? requestSnapshotRaw.decisionMode
          : "neutral",
    };

    return {
      id,
      backtestRunId: id,
      generatedAt,
      requestSnapshot,
      strategy: {
        id: run.strategyId,
        name: run.strategyName ?? "Custom Weighted Fusion",
        params: parseJsonObject(run.strategyParams),
        factorWeights: {
          trend: toNumber(parseJsonObject(run.factorWeights).trend),
          momentum: toNumber(parseJsonObject(run.factorWeights).momentum),
          meanReversion: toNumber(parseJsonObject(run.factorWeights).meanReversion),
          volatility: toNumber(parseJsonObject(run.factorWeights).volatility),
          volume: toNumber(parseJsonObject(run.factorWeights).volume),
          structure: toNumber(parseJsonObject(run.factorWeights).structure),
        },
        decisionThreshold: {
          mode:
            parseJsonObject(run.decisionThreshold).mode === "aggressive" ||
            parseJsonObject(run.decisionThreshold).mode === "neutral" ||
            parseJsonObject(run.decisionThreshold).mode === "conservative"
              ? (parseJsonObject(run.decisionThreshold).mode as "aggressive" | "neutral" | "conservative")
              : "neutral",
          long: toNumber(parseJsonObject(run.decisionThreshold).long),
          short: toNumber(parseJsonObject(run.decisionThreshold).short),
          quantile: toNumber(parseJsonObject(run.decisionThreshold).quantile),
          source:
            parseJsonObject(run.decisionThreshold).source === "fallback"
              ? "fallback"
              : "auto_composite_quantile",
          sampleSize: toInteger(parseJsonObject(run.decisionThreshold).sampleSize),
        },
      },
      timeframe: run.timeframe,
      lookbackBars: toInteger(run.lookbackBars),
      initialCapital: toNumber(run.initialCapital),
      symbols: parseStringArray(run.symbols),
      results,
      portfolio: {
        totalReturnPct: toNumber(run.portfolioTotalReturnPct),
        maxDrawdownPct: toNumber(run.portfolioMaxDrawdownPct),
        winRatePct: toNumber(run.portfolioWinRatePct),
        volatilityPct: toNumber(run.portfolioVolatilityPct),
        sharpe: toNumber(run.portfolioSharpe),
        avgStabilityScore: toNumber(run.portfolioAvgStabilityScore),
        longBarsPct: toNumber(run.portfolioLongBarsPct),
        shortBarsPct: toNumber(run.portfolioShortBarsPct),
        flatBarsPct: toNumber(run.portfolioFlatBarsPct),
        longReturnPct: toNumber(run.portfolioLongReturnPct),
        shortReturnPct: toNumber(run.portfolioShortReturnPct),
        bestSymbol: run.portfolioBestSymbol,
        worstSymbol: run.portfolioWorstSymbol,
        equityCurve: portfolioRows.rows.map((row) => ({
          ts: toIso(row.ts),
          equity: toNumber(row.equity),
        })),
      },
    };
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.pg.query<{ id: string }>(
      `DELETE FROM backtest_runs
      WHERE id = $1
      RETURNING id`,
      [id],
    );
    return result.rows.length > 0;
  }
}
