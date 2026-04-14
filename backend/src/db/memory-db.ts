import { randomUUID } from "node:crypto";
import type {
  AccountSummary,
  AccountSnapshot,
  EquityPoint,
  Fill,
  Kline,
  Order,
  OrderStatus,
  Position,
  Quote,
  RiskEvent,
  RiskRules,
  Run,
  ScanResult,
  ScanRun,
  Strategy,
} from "../domain/types.js";

type DbState = {
  strategies: Map<string, Strategy>;
  runs: Map<string, Run>;
  cashBalance: number;
  positions: Map<string, Position>;
  quotes: Map<string, Quote>;
  klines: Kline[];
  equityCurve: EquityPoint[];
  scanRuns: Map<string, ScanRun>;
  scanResults: Map<string, ScanResult[]>;
  orders: Map<string, Order>;
  fills: Fill[];
  riskRules: RiskRules;
  riskEvents: RiskEvent[];
  accountSnapshots: AccountSnapshot[];
};

export type MemoryTransaction = {
  listStrategies: () => Strategy[];
  createStrategy: (input: Pick<Strategy, "name" | "description" | "isEnabled" | "params">) => Strategy;
  updateStrategy: (
    id: string,
    input: Partial<Pick<Strategy, "name" | "description" | "isEnabled" | "params">>,
  ) => Strategy | null;
  deleteStrategy: (id: string) => boolean;
  getStrategyById: (id: string) => Strategy | null;
  listRuns: () => Run[];
  getActiveRun: () => Run | null;
  getRunById: (id: string) => Run | null;
  startRun: (input: { strategyId: string; initialCash: number }) => Run;
  stopRun: (runId: string, stopReason: string) => Run | null;
  listQuotes: (symbols?: string[]) => Quote[];
  setQuotes: (quotes: Quote[]) => void;
  listKlines: (input: { symbol: string; timeframe: string; limit: number }) => Kline[];
  upsertKlines: (klines: Kline[]) => void;
  listPositions: () => Position[];
  getCashBalance: () => number;
  setCashBalance: (value: number) => void;
  upsertPosition: (position: Position) => void;
  getAccountSummary: () => AccountSummary;
  pushEquityPoint: (point: EquityPoint) => void;
  listEquityPoints: (limit: number) => EquityPoint[];
  createScanRun: (input: { timeframe: string; requestedSymbols: string[] }) => ScanRun;
  completeScanRun: (id: string, status: "completed" | "failed", errorMessage?: string | null) => ScanRun | null;
  setScanResults: (scanRunId: string, results: ScanResult[]) => void;
  listLatestScanResults: (limit: number) => ScanResult[];
  listOrders: (input?: { status?: OrderStatus; symbol?: string; limit?: number }) => Order[];
  getOrderById: (id: string) => Order | null;
  createOrder: (input: {
    runId: string | null;
    strategyId: string | null;
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit";
    quantity: number;
    limitPrice: number | null;
  }) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => Order | null;
  listFills: (input?: { symbol?: string; orderId?: string; runId?: string; limit?: number }) => Fill[];
  addFill: (input: Omit<Fill, "id" | "createdAt">) => Fill;
  getRiskRules: () => RiskRules;
  updateRiskRules: (patch: Partial<RiskRules>) => RiskRules;
  addRiskEvent: (event: Omit<RiskEvent, "id">) => RiskEvent;
  listRiskEvents: (input?: { limit?: number; severity?: RiskEvent["severity"]; runId?: string }) => RiskEvent[];
  addAccountSnapshot: (input: Omit<AccountSnapshot, "id">) => AccountSnapshot;
  listAccountSnapshots: (input?: {
    runId?: string;
    limit?: number;
    from?: string;
    to?: string;
  }) => AccountSnapshot[];
};

const nowIso = (): string => new Date().toISOString();

const cloneState = (state: DbState): DbState => ({
  strategies: new Map(
    [...state.strategies.entries()].map(([key, value]) => [
      key,
      {
        ...value,
        params: structuredClone(value.params),
      },
    ]),
  ),
  runs: new Map([...state.runs.entries()].map(([key, value]) => [key, { ...value }])),
  cashBalance: state.cashBalance,
  positions: new Map([...state.positions.entries()].map(([key, value]) => [key, { ...value }])),
  quotes: new Map([...state.quotes.entries()].map(([key, value]) => [key, { ...value }])),
  klines: state.klines.map((item) => ({ ...item })),
  equityCurve: state.equityCurve.map((point) => ({ ...point })),
  scanRuns: new Map([...state.scanRuns.entries()].map(([key, value]) => [key, { ...value }])),
  scanResults: new Map([...state.scanResults.entries()].map(([key, value]) => [key, value.map((item) => ({ ...item }))])),
  orders: new Map([...state.orders.entries()].map(([key, value]) => [key, { ...value }])),
  fills: state.fills.map((fill) => ({ ...fill })),
  riskRules: { ...state.riskRules },
  riskEvents: state.riskEvents.map((event) => ({ ...event })),
  accountSnapshots: state.accountSnapshots.map((snapshot) => ({ ...snapshot })),
});

const calculateSummary = (state: DbState): AccountSummary => {
  const positions = [...state.positions.values()];
  const grossExposure = positions.reduce((sum, position) => sum + Math.abs(position.marketValue), 0);
  const netExposure = positions.reduce((sum, position) => sum + position.marketValue, 0);
  const unrealizedPnl = positions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
  const realizedPnl = positions.reduce((sum, position) => sum + position.realizedPnl, 0);
  const equity = state.cashBalance + netExposure;
  const buyingPower = Math.max(0, state.cashBalance + Math.max(0, equity - grossExposure * 0.25));
  const peakEquity = state.equityCurve.length
    ? Math.max(...state.equityCurve.map((point) => point.equity), equity)
    : equity;
  const drawdownPct = peakEquity > 0 ? Math.max(0, (peakEquity - equity) / peakEquity) : 0;

  return {
    cashBalance: Number(state.cashBalance.toFixed(2)),
    equity: Number(equity.toFixed(2)),
    buyingPower: Number(buyingPower.toFixed(2)),
    grossExposure: Number(grossExposure.toFixed(2)),
    netExposure: Number(netExposure.toFixed(2)),
    unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
    realizedPnl: Number(realizedPnl.toFixed(2)),
    drawdownPct: Number(drawdownPct.toFixed(6)),
    updatedAt: nowIso(),
  };
};

const createTransaction = (state: DbState): MemoryTransaction => ({
  listStrategies: () => [...state.strategies.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  createStrategy: (input) => {
    const timestamp = nowIso();
    const strategy: Strategy = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      isEnabled: input.isEnabled,
      params: input.params,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.strategies.set(strategy.id, strategy);
    return strategy;
  },
  updateStrategy: (id, input) => {
    const existing = state.strategies.get(id);
    if (!existing) {
      return null;
    }
    const updated: Strategy = {
      ...existing,
      ...input,
      params: input.params ?? existing.params,
      updatedAt: nowIso(),
    };
    state.strategies.set(id, updated);
    return updated;
  },
  deleteStrategy: (id) => state.strategies.delete(id),
  getStrategyById: (id) => state.strategies.get(id) ?? null,
  listRuns: () => [...state.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getActiveRun: () => [...state.runs.values()].find((run) => run.status === "running") ?? null,
  getRunById: (id) => state.runs.get(id) ?? null,
  startRun: ({ strategyId, initialCash }) => {
    const activeRun = [...state.runs.values()].find((run) => run.status === "running");
    if (activeRun) {
      throw new Error("active_run_exists");
    }
    const timestamp = nowIso();
    const run: Run = {
      id: randomUUID(),
      strategyId,
      status: "running",
      startedAt: timestamp,
      stoppedAt: null,
      stopReason: null,
      initialCash,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.runs.set(run.id, run);
    state.cashBalance = initialCash;
    state.positions.clear();
    state.equityCurve = [{
      ts: timestamp,
      equity: initialCash,
      cashBalance: initialCash,
    }];
    return run;
  },
  stopRun: (runId, stopReason) => {
    const existing = state.runs.get(runId);
    if (!existing) {
      return null;
    }
    const updated: Run = {
      ...existing,
      status: "stopped",
      stoppedAt: nowIso(),
      stopReason,
      updatedAt: nowIso(),
    };
    state.runs.set(runId, updated);
    return updated;
  },
  listQuotes: (symbols) => {
    const rows = [...state.quotes.values()];
    if (!symbols || symbols.length === 0) {
      return rows.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    const symbolSet = new Set(symbols.map((symbol) => symbol.toUpperCase()));
    return rows.filter((row) => symbolSet.has(row.symbol));
  },
  setQuotes: (quotes) => {
    for (const quote of quotes) {
      state.quotes.set(quote.symbol, quote);
      const existingPosition = state.positions.get(quote.symbol);
      if (existingPosition) {
        const marketValue = quote.last * existingPosition.quantity;
        const unrealizedPnl = (quote.last - existingPosition.avgCost) * existingPosition.quantity;
        state.positions.set(quote.symbol, {
          ...existingPosition,
          marketPrice: quote.last,
          marketValue: Number(marketValue.toFixed(8)),
          unrealizedPnl: Number(unrealizedPnl.toFixed(8)),
          updatedAt: nowIso(),
        });
      }
    }
  },
  listKlines: ({ symbol, timeframe, limit }) =>
    state.klines
      .filter((row) => row.symbol === symbol && row.timeframe === timeframe)
      .sort((a, b) => b.openTime.localeCompare(a.openTime))
      .slice(0, limit),
  upsertKlines: (klines) => {
    const keyOf = (row: Kline): string => `${row.symbol}|${row.timeframe}|${row.openTime}`;
    const incoming = new Set(klines.map((row) => keyOf(row)));
    const base = state.klines.filter((row) => !incoming.has(keyOf(row)));
    state.klines = [...base, ...klines]
      .sort((a, b) => b.openTime.localeCompare(a.openTime))
      .slice(0, 10000);
  },
  listPositions: () => [...state.positions.values()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
  getCashBalance: () => state.cashBalance,
  setCashBalance: (value) => {
    state.cashBalance = value;
  },
  upsertPosition: (position) => {
    state.positions.set(position.symbol, { ...position });
  },
  getAccountSummary: () => calculateSummary(state),
  pushEquityPoint: (point) => {
    state.equityCurve.push(point);
    state.equityCurve = state.equityCurve
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .slice(-500);
  },
  listEquityPoints: (limit) =>
    [...state.equityCurve]
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, limit),
  createScanRun: ({ timeframe, requestedSymbols }) => {
    const timestamp = nowIso();
    const scanRun: ScanRun = {
      id: randomUUID(),
      status: "running",
      timeframe,
      requestedSymbols,
      startedAt: timestamp,
      completedAt: null,
      errorMessage: null,
      createdAt: timestamp,
    };
    state.scanRuns.set(scanRun.id, scanRun);
    return scanRun;
  },
  completeScanRun: (id, status, errorMessage) => {
    const existing = state.scanRuns.get(id);
    if (!existing) {
      return null;
    }
    const completed: ScanRun = {
      ...existing,
      status,
      completedAt: nowIso(),
      errorMessage: errorMessage ?? null,
    };
    state.scanRuns.set(id, completed);
    return completed;
  },
  setScanResults: (scanRunId, results) => {
    state.scanResults.set(scanRunId, results.map((item) => ({ ...item })));
  },
  listLatestScanResults: (limit) =>
    [...state.scanResults.values()]
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  listOrders: (input) => {
    const rows = [...state.orders.values()]
      .filter((row) => (input?.status ? row.status === input.status : true))
      .filter((row) => (input?.symbol ? row.symbol === input.symbol.toUpperCase() : true))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return rows.slice(0, input?.limit ?? 200);
  },
  getOrderById: (id) => state.orders.get(id) ?? null,
  createOrder: (input) => {
    const timestamp = nowIso();
    const order: Order = {
      id: randomUUID(),
      runId: input.runId,
      strategyId: input.strategyId,
      symbol: input.symbol.toUpperCase(),
      side: input.side,
      type: input.type,
      status: input.type === "limit" ? "open" : "new",
      quantity: input.quantity,
      limitPrice: input.limitPrice,
      filledQuantity: 0,
      avgFillPrice: null,
      requestedAt: timestamp,
      openedAt: timestamp,
      cancelledAt: null,
      rejectedReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.orders.set(order.id, order);
    return order;
  },
  updateOrder: (id, patch) => {
    const existing = state.orders.get(id);
    if (!existing) {
      return null;
    }
    const updated: Order = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: nowIso(),
    };
    state.orders.set(id, updated);
    return updated;
  },
  listFills: (input) => {
    const rows = state.fills
      .filter((fill) => (input?.symbol ? fill.symbol === input.symbol.toUpperCase() : true))
      .filter((fill) => (input?.orderId ? fill.orderId === input.orderId : true))
      .filter((fill) => (input?.runId ? fill.runId === input.runId : true))
      .sort((a, b) => b.filledAt.localeCompare(a.filledAt));
    return rows.slice(0, input?.limit ?? 200);
  },
  addFill: (input) => {
    const fill: Fill = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...input,
    };
    state.fills.push(fill);
    return fill;
  },
  getRiskRules: () => ({ ...state.riskRules }),
  updateRiskRules: (patch) => {
    state.riskRules = {
      ...state.riskRules,
      ...patch,
      name: patch.name ?? state.riskRules.name,
      updatedAt: nowIso(),
    };
    return { ...state.riskRules };
  },
  addRiskEvent: (event) => {
    const created: RiskEvent = {
      id: randomUUID(),
      ...event,
    };
    state.riskEvents.push(created);
    return created;
  },
  listRiskEvents: (input) => {
    const rows = state.riskEvents
      .filter((event) => (input?.severity ? event.severity === input.severity : true))
      .filter((event) => (input?.runId ? event.runId === input.runId : true))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return rows.slice(0, input?.limit ?? 200);
  },
  addAccountSnapshot: (input) => {
    const snapshot: AccountSnapshot = {
      id: randomUUID(),
      ...input,
    };
    state.accountSnapshots.push(snapshot);
    // Retention strategy: keep latest 2000 snapshots globally.
    if (state.accountSnapshots.length > 2000) {
      state.accountSnapshots = state.accountSnapshots
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 2000);
    }
    return snapshot;
  },
  listAccountSnapshots: (input) => {
    const rows = state.accountSnapshots
      .filter((snapshot) => (input?.runId ? snapshot.runId === input.runId : true))
      .filter((snapshot) => (input?.from ? snapshot.createdAt >= input.from : true))
      .filter((snapshot) => (input?.to ? snapshot.createdAt <= input.to : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rows.slice(0, input?.limit ?? 500);
  },
});

export class MemoryDb {
  #state: DbState;

  constructor(seed: Partial<DbState> = {}) {
    const timestamp = nowIso();
    const defaultStrategy: Strategy = {
      id: randomUUID(),
      name: "Momentum Breakout",
      description: "Default foundation strategy",
      isEnabled: true,
      params: { timeframe: "15m", riskPct: 0.02 },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const quoteSeed: Quote[] = [
      {
        symbol: "BTCUSDT",
        bid: 68495.12,
        ask: 68498.33,
        last: 68496.76,
        change24hPct: 2.34,
        volume24h: 22850000000,
        updatedAt: timestamp,
      },
      {
        symbol: "ETHUSDT",
        bid: 3588.12,
        ask: 3588.55,
        last: 3588.44,
        change24hPct: 1.21,
        volume24h: 9730000000,
        updatedAt: timestamp,
      },
      {
        symbol: "SOLUSDT",
        bid: 148.37,
        ask: 148.42,
        last: 148.4,
        change24hPct: 4.05,
        volume24h: 1650000000,
        updatedAt: timestamp,
      },
    ];

    const initialPositions = new Map<string, Position>([
      [
        "BTCUSDT",
        {
          symbol: "BTCUSDT",
          quantity: 0.25,
          avgCost: 68250.12,
          marketPrice: 68496.76,
          marketValue: Number((0.25 * 68496.76).toFixed(8)),
          unrealizedPnl: Number(((68496.76 - 68250.12) * 0.25).toFixed(8)),
          realizedPnl: 0,
          updatedAt: timestamp,
        },
      ],
      [
        "ETHUSDT",
        {
          symbol: "ETHUSDT",
          quantity: -0.75,
          avgCost: 3595.8,
          marketPrice: 3588.44,
          marketValue: Number((-0.75 * 3588.44).toFixed(8)),
          unrealizedPnl: Number(((3588.44 - 3595.8) * -0.75).toFixed(8)),
          realizedPnl: 112.44,
          updatedAt: timestamp,
        },
      ],
    ]);

    const initialEquity = 100000;
    const initialKlines: Kline[] = [
      {
        symbol: "BTCUSDT",
        timeframe: "15m",
        openTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        closeTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        open: 68110,
        high: 68350,
        low: 68090,
        close: 68220,
        volume: 1210.55,
        trades: 15420,
      },
      {
        symbol: "BTCUSDT",
        timeframe: "15m",
        openTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        closeTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        open: 68220,
        high: 68440,
        low: 68180,
        close: 68390,
        volume: 1392.21,
        trades: 16680,
      },
      {
        symbol: "BTCUSDT",
        timeframe: "15m",
        openTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        closeTime: new Date().toISOString(),
        open: 68390,
        high: 68560,
        low: 68310,
        close: 68496.76,
        volume: 1522.78,
        trades: 17245,
      },
      {
        symbol: "ETHUSDT",
        timeframe: "15m",
        openTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        closeTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        open: 3572,
        high: 3590,
        low: 3568,
        close: 3588.5,
        volume: 9850.22,
        trades: 12840,
      },
      {
        symbol: "ETHUSDT",
        timeframe: "15m",
        openTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        closeTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        open: 3588.5,
        high: 3608.4,
        low: 3584.7,
        close: 3600.1,
        volume: 10620.91,
        trades: 13110,
      },
      {
        symbol: "ETHUSDT",
        timeframe: "15m",
        openTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        closeTime: new Date().toISOString(),
        open: 3600.1,
        high: 3609.9,
        low: 3596.2,
        close: 3588.44,
        volume: 10112.45,
        trades: 12760,
      },
    ];

    this.#state = {
      strategies: seed.strategies ?? new Map([[defaultStrategy.id, defaultStrategy]]),
      runs: seed.runs ?? new Map<string, Run>(),
      cashBalance: seed.cashBalance ?? 85000,
      positions: seed.positions ?? initialPositions,
      quotes: seed.quotes ?? new Map(quoteSeed.map((quote) => [quote.symbol, quote])),
      klines: seed.klines ?? initialKlines,
      equityCurve: seed.equityCurve ?? [{ ts: timestamp, equity: initialEquity, cashBalance: 85000 }],
      scanRuns: seed.scanRuns ?? new Map<string, ScanRun>(),
      scanResults: seed.scanResults ?? new Map<string, ScanResult[]>(),
      orders: seed.orders ?? new Map<string, Order>(),
      fills: seed.fills ?? [],
      riskRules: seed.riskRules ?? {
        name: "default-paper-risk",
        isEnabled: true,
        maxSymbolExposurePct: 0.25,
        maxGrossExposurePct: 1.2,
        maxDrawdownPct: 0.12,
        minCashBalance: 500,
        maxOrderNotional: 15000,
        updatedAt: timestamp,
      },
      riskEvents: seed.riskEvents ?? [],
      accountSnapshots: seed.accountSnapshots ?? [],
    };
  }

  async withTransaction<T>(fn: (tx: MemoryTransaction) => Promise<T> | T): Promise<T> {
    const workingCopy = cloneState(this.#state);
    const tx = createTransaction(workingCopy);
    try {
      const result = await fn(tx);
      this.#state = workingCopy;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async read<T>(fn: (tx: MemoryTransaction) => T): Promise<T> {
    const tx = createTransaction(cloneState(this.#state));
    return fn(tx);
  }
}
