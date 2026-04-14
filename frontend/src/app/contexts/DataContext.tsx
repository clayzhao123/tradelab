import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  api,
  type AccountSummary,
  type MarketWatchlistItem,
  type Fill,
  type HistoryRunDetail,
  type HistoryRunSummary,
  type Kline,
  type Order,
  type Position,
  type Quote,
  type RiskEvent,
  type RiskRules,
  type Run,
  type ScanResult,
  type Strategy,
} from "../../shared/api/client";
import { createWsClient, type WsEvent } from "../../shared/realtime/wsClient";

type OrderStatusFilter = "all" | "new" | "open" | "partial" | "filled" | "cancelled" | "rejected";

type KlineTarget = {
  symbol: string;
  timeframe: string;
  limit: number;
};

interface DataContextValue {
  marketDataProvider: "mock" | "real" | null;
  watchlist: MarketWatchlistItem[];
  watchlistUpdatedAt: string | null;
  watchlistNextRefreshAt: string | null;
  dashboardRefreshIntervalMs: number;
  quotes: Quote[];
  klines: Kline[];
  klineTarget: KlineTarget;
  scanResults: ScanResult[];
  accountSummary: AccountSummary | null;
  positions: Position[];
  orders: Order[];
  fills: Fill[];
  strategies: Strategy[];
  runs: Run[];
  historyRuns: HistoryRunSummary[];
  historyDetail: HistoryRunDetail | null;
  riskRules: RiskRules | null;
  riskEvents: RiskEvent[];
  wsStatus: "connecting" | "open" | "closed" | "error";
  activeRun: Run | null;
  refreshDashboard: (input?: { symbol?: string; timeframe?: string; forceScan?: boolean }) => Promise<void>;
  loadKlines: (symbol: string, timeframe?: string, limit?: number) => Promise<void>;
  runScan: (symbols: string[], timeframe?: string) => Promise<void>;
  refreshOrders: (filters?: { status?: string; symbol?: string }) => Promise<void>;
  refreshStrategiesRuns: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshRisk: () => Promise<void>;
  refreshAll: () => Promise<void>;
  placeOrder: (order: {
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit";
    quantity: number;
    limitPrice?: number;
  }) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  createStrategy: (strategy: { name: string; description: string; params: Record<string, unknown> }) => Promise<void>;
  updateStrategy: (
    id: string,
    patch: Partial<{
      name: string;
      description: string;
      params: Record<string, unknown>;
      isEnabled: boolean;
    }>,
  ) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  startRun: (input: { strategyId: string; initialCash: number }) => Promise<void>;
  stopRun: (runId: string, stopReason: string) => Promise<void>;
  loadHistoryDetail: (runId: string) => Promise<void>;
  updateRiskRules: (
    patch: Partial<{
      name: string;
      isEnabled: boolean;
      maxSymbolExposurePct: number;
      maxGrossExposurePct: number;
      maxDrawdownPct: number;
      minCashBalance: number;
      maxOrderNotional: number;
    }>,
  ) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const DEFAULT_KLINE_TARGET: KlineTarget = {
  symbol: "BTCUSDT",
  timeframe: "15m",
  limit: 80,
};

const DEFAULT_DASHBOARD_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "DOTUSDT",
];
const DASHBOARD_REFRESH_INTERVAL_MS = 10_000;

function normalizeSymbol(input: string): string {
  const normalized = input.trim().toUpperCase();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
}

function normalizeOrderFilters(filters?: { status?: string; symbol?: string }): {
  status: OrderStatusFilter;
  symbol: string;
} {
  const normalizedStatus = (filters?.status ?? "all").toLowerCase();
  const statusSet: Set<OrderStatusFilter> = new Set([
    "all",
    "new",
    "open",
    "partial",
    "filled",
    "cancelled",
    "rejected",
  ]);
  return {
    status: statusSet.has(normalizedStatus as OrderStatusFilter)
      ? (normalizedStatus as OrderStatusFilter)
      : "all",
    symbol: normalizeSymbol(filters?.symbol ?? ""),
  };
}

function sortQuotes(quotes: Quote[]): Quote[] {
  return [...quotes].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function mergeQuotes(previous: Quote[], incoming: Quote[]): Quote[] {
  const map = new Map(previous.map((quote) => [quote.symbol, quote]));
  for (const quote of incoming) {
    map.set(quote.symbol, quote);
  }
  return sortQuotes([...map.values()]);
}

function sortOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

function sortFills(fills: Fill[]): Fill[] {
  return [...fills].sort((a, b) => b.filledAt.localeCompare(a.filledAt));
}

function sortStrategies(strategies: Strategy[]): Strategy[] {
  return [...strategies].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortScanResults(results: ScanResult[]): ScanResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}

function sortHistoryRuns(runs: HistoryRunSummary[]): HistoryRunSummary[] {
  return [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortRuns(runs: Run[]): Run[] {
  return [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function sortRiskEvents(events: RiskEvent[]): RiskEvent[] {
  return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function shouldAcceptKlines(klines: Kline[], target: KlineTarget): boolean {
  if (klines.length === 0) {
    return false;
  }
  const matched = klines.every((kline) => kline.symbol === target.symbol && kline.timeframe === target.timeframe);
  if (!matched) {
    return false;
  }
  return klines.length >= Math.min(20, target.limit);
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within DataProvider");
  }
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [wsStatus, setWsStatus] = useState<DataContextValue["wsStatus"]>("connecting");
  const [marketDataProvider, setMarketDataProvider] = useState<"mock" | "real" | null>(null);
  const [watchlist, setWatchlist] = useState<MarketWatchlistItem[]>([]);
  const [watchlistUpdatedAt, setWatchlistUpdatedAt] = useState<string | null>(null);
  const [watchlistNextRefreshAt, setWatchlistNextRefreshAt] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [klines, setKlines] = useState<Kline[]>([]);
  const [klineTarget, setKlineTarget] = useState<KlineTarget>(DEFAULT_KLINE_TARGET);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [historyRuns, setHistoryRuns] = useState<HistoryRunSummary[]>([]);
  const [historyDetail, setHistoryDetail] = useState<HistoryRunDetail | null>(null);
  const [riskRules, setRiskRules] = useState<RiskRules | null>(null);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);

  const klineTargetRef = useRef<KlineTarget>(DEFAULT_KLINE_TARGET);
  const orderFiltersRef = useRef<{ status: OrderStatusFilter; symbol: string }>({
    status: "all",
    symbol: "",
  });
  const hasSnapshotRef = useRef(false);
  const lastEventSeqRef = useRef(0);
  const lastEventTsRef = useRef("");

  const activeRun = useMemo(() => runs.find((run) => run.status === "running") ?? null, [runs]);

  const loadKlines = useCallback(async (symbol: string, timeframe = "15m", limit = 80): Promise<void> => {
    const normalizedSymbol = normalizeSymbol(symbol) || DEFAULT_KLINE_TARGET.symbol;
    const nextTarget: KlineTarget = {
      symbol: normalizedSymbol,
      timeframe,
      limit,
    };
    klineTargetRef.current = nextTarget;
    setKlineTarget(nextTarget);
    const nextKlines = await api.getKlines(normalizedSymbol, timeframe, limit);
    setKlines(nextKlines);
  }, []);

  const refreshDashboard = useCallback(
    async (input?: { symbol?: string; timeframe?: string; forceScan?: boolean }): Promise<void> => {
      const currentTarget = klineTargetRef.current;
      const symbol = normalizeSymbol(input?.symbol ?? currentTarget.symbol) || DEFAULT_KLINE_TARGET.symbol;
      const timeframe = input?.timeframe ?? currentTarget.timeframe;
      const limit = currentTarget.limit;
      const nextTarget: KlineTarget = { symbol, timeframe, limit };
      if (
        nextTarget.symbol !== currentTarget.symbol ||
        nextTarget.timeframe !== currentTarget.timeframe ||
        nextTarget.limit !== currentTarget.limit
      ) {
        klineTargetRef.current = nextTarget;
        setKlineTarget(nextTarget);
      }

      const watchlistPayload = await api.getMarketWatchlist(100).catch(() => ({
        provider: "mock" as const,
        updatedAt: new Date().toISOString(),
        nextRefreshAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        items: DEFAULT_DASHBOARD_SYMBOLS.map((symbol, index) => ({
          symbol,
          rank: index + 1,
          marketCapUsd: 0,
        })),
      }));
      const watchlistSymbols =
        watchlistPayload.items.map((item) => item.symbol).filter(Boolean).slice(0, 100);
      const quoteUniverse = watchlistSymbols.length > 0 ? watchlistSymbols : DEFAULT_DASHBOARD_SYMBOLS;
      const scanUniverse = quoteUniverse.slice(0, 30);

      const [nextQuotes, nextSummary, nextPositions, nextKlines] = await Promise.all([
        api.getQuotes(quoteUniverse),
        api.getAccountSummary(),
        api.getPositions(),
        api.getKlines(nextTarget.symbol, nextTarget.timeframe, nextTarget.limit),
      ]);

      let nextScanResults = await api.getScanResults(30);
      if (input?.forceScan || nextScanResults.length === 0) {
        try {
          const scanResponse = await api.runScan(scanUniverse, nextTarget.timeframe);
          nextScanResults = scanResponse.results;
        } catch {
          // keep the last successful result set if scan trigger fails
        }
      }

      setWatchlist(watchlistPayload.items);
      setMarketDataProvider(watchlistPayload.provider);
      setWatchlistUpdatedAt(watchlistPayload.updatedAt);
      setWatchlistNextRefreshAt(watchlistPayload.nextRefreshAt);
      setQuotes(sortQuotes(nextQuotes));
      setKlines(nextKlines);
      setScanResults(sortScanResults(nextScanResults));
      setAccountSummary(nextSummary);
      setPositions(nextPositions);
    },
    [],
  );

  const runScan = useCallback(async (symbols: string[], timeframe = "15m"): Promise<void> => {
    const uniqueSymbols = [...new Set(symbols.map((symbol) => normalizeSymbol(symbol)).filter(Boolean))];
    if (uniqueSymbols.length === 0) {
      return;
    }
    const { results } = await api.runScan(uniqueSymbols, timeframe);
    setScanResults(sortScanResults(results));
  }, []);

  const refreshOrders = useCallback(async (filters?: { status?: string; symbol?: string }): Promise<void> => {
    const normalized = normalizeOrderFilters(filters ?? orderFiltersRef.current);
    orderFiltersRef.current = normalized;

    const status = normalized.status === "all" ? undefined : (normalized.status as Order["status"]);
    const symbol = normalized.symbol || undefined;

    const [nextOrders, nextFills] = await Promise.all([
      api.getOrders({ limit: 100, status, symbol }),
      api.getFills({ limit: 100, symbol }),
    ]);

    setOrders(sortOrders(nextOrders));
    setFills(sortFills(nextFills));
  }, []);

  const refreshStrategies = useCallback(async (): Promise<void> => {
    const nextStrategies = await api.getStrategies();
    setStrategies(sortStrategies(nextStrategies));
  }, []);

  const refreshStrategiesRuns = useCallback(async (): Promise<void> => {
    const [strategiesResult, runsResult] = await Promise.allSettled([api.getStrategies(), api.getRuns()]);
    if (strategiesResult.status === "fulfilled") {
      setStrategies(sortStrategies(strategiesResult.value));
    }
    if (runsResult.status === "fulfilled") {
      setRuns(sortRuns(runsResult.value));
    }
    if (strategiesResult.status === "rejected" && runsResult.status === "rejected") {
      throw strategiesResult.reason;
    }
  }, []);

  const refreshHistory = useCallback(async (): Promise<void> => {
    const nextRuns = await api.getHistoryRuns(100);
    setHistoryRuns(sortHistoryRuns(nextRuns));
  }, []);

  const refreshRisk = useCallback(async (): Promise<void> => {
    const [nextRules, nextEvents] = await Promise.all([api.getRiskRules(), api.getRiskEvents({ limit: 100 })]);
    setRiskRules(nextRules);
    setRiskEvents(sortRiskEvents(nextEvents));
  }, []);

  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      refreshDashboard(),
      refreshOrders(),
      refreshStrategiesRuns(),
      refreshHistory(),
      refreshRisk(),
    ]);
  }, [refreshDashboard, refreshOrders, refreshStrategiesRuns, refreshHistory, refreshRisk]);

  const placeOrder = useCallback(
    async (order: {
      symbol: string;
      side: "buy" | "sell";
      type: "market" | "limit";
      quantity: number;
      limitPrice?: number;
    }): Promise<void> => {
      const symbol = normalizeSymbol(order.symbol);
      if (!symbol) {
        throw new Error("symbol_required");
      }

      const payload = {
        ...order,
        symbol,
        runId: activeRun?.id,
      };
      await api.createOrder(payload);
      await Promise.all([refreshOrders(), refreshDashboard(), refreshRisk()]);
    },
    [activeRun, refreshOrders, refreshDashboard, refreshRisk],
  );

  const cancelOrder = useCallback(
    async (orderId: string): Promise<void> => {
      await api.cancelOrder(orderId);
      await Promise.all([refreshOrders(), refreshDashboard()]);
    },
    [refreshOrders, refreshDashboard],
  );

  const createStrategy = useCallback(
    async (strategy: {
      name: string;
      description: string;
      params: Record<string, unknown>;
    }): Promise<void> => {
      const created = await api.createStrategy(strategy);
      setStrategies((prev) => sortStrategies([created, ...prev.filter((row) => row.id !== created.id)]));
      void refreshStrategies().catch(() => {
        // keep optimistic strategy update when follow-up refresh fails
      });
    },
    [refreshStrategies],
  );

  const updateStrategy = useCallback(
    async (
      id: string,
      patch: Partial<{
        name: string;
        description: string;
        params: Record<string, unknown>;
        isEnabled: boolean;
      }>,
    ): Promise<void> => {
      const updated = await api.updateStrategy(id, patch);
      setStrategies((prev) => sortStrategies([updated, ...prev.filter((row) => row.id !== updated.id)]));
      void refreshStrategies().catch(() => {
        // keep optimistic strategy update when follow-up refresh fails
      });
    },
    [refreshStrategies],
  );

  const deleteStrategy = useCallback(
    async (id: string): Promise<void> => {
      await api.deleteStrategy(id);
      setStrategies((prev) => prev.filter((row) => row.id !== id));
      void refreshStrategies().catch(() => {
        // keep optimistic strategy delete when follow-up refresh fails
      });
    },
    [refreshStrategies],
  );

  const startRun = useCallback(
    async (input: { strategyId: string; initialCash: number }): Promise<void> => {
      await api.startRun(input);
      await Promise.all([refreshStrategiesRuns(), refreshDashboard(), refreshHistory()]);
    },
    [refreshStrategiesRuns, refreshDashboard, refreshHistory],
  );

  const stopRun = useCallback(
    async (runId: string, stopReason: string): Promise<void> => {
      await api.stopRun(runId, stopReason);
      await Promise.all([refreshStrategiesRuns(), refreshDashboard(), refreshHistory()]);
    },
    [refreshStrategiesRuns, refreshDashboard, refreshHistory],
  );

  const loadHistoryDetail = useCallback(async (runId: string): Promise<void> => {
    const detail = await api.getHistoryRunDetail(runId);
    setHistoryDetail(detail);
  }, []);

  const updateRiskRules = useCallback(
    async (
      patch: Partial<{
        name: string;
        isEnabled: boolean;
        maxSymbolExposurePct: number;
        maxGrossExposurePct: number;
        maxDrawdownPct: number;
        minCashBalance: number;
        maxOrderNotional: number;
      }>,
    ): Promise<void> => {
      const updated = await api.updateRiskRules(patch);
      setRiskRules(updated);
      await refreshRisk();
    },
    [refreshRisk],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAll();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshAll]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshAll().catch(() => {
        // noop: polling failure should not crash UI
      });
    }, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshAll]);

  useEffect(() => {
    const applyDashboardPayload = (data: Record<string, unknown>): void => {
      if (data.accountSummary) {
        setAccountSummary(data.accountSummary as AccountSummary);
      }

      if ("activeRun" in data) {
        const nextActiveRun = (data.activeRun ?? null) as Run | null;
        if (nextActiveRun) {
          setRuns((prev) => sortRuns([nextActiveRun, ...prev.filter((row) => row.id !== nextActiveRun.id)]));
        } else {
          setRuns((prev) => prev.filter((row) => row.status !== "running"));
        }
      }

      if (data.quotes) {
        const incomingQuotes = sortQuotes(data.quotes as Quote[]);
        setQuotes((prev) => mergeQuotes(prev, incomingQuotes));
      }

      if (data.klines) {
        const incomingKlines = data.klines as Kline[];
        if (shouldAcceptKlines(incomingKlines, klineTargetRef.current)) {
          setKlines(incomingKlines);
        }
      }

      if (data.scanResults) {
        setScanResults(sortScanResults(data.scanResults as ScanResult[]));
      }
    };

    const ws = createWsClient({
      onStatus: (status) => {
        setWsStatus(status);
        if (status === "connecting") {
          // A reconnect starts a fresh stream; we require a new snapshot baseline.
          hasSnapshotRef.current = false;
          lastEventSeqRef.current = 0;
          lastEventTsRef.current = "";
        }
      },
      onEvent: (event: WsEvent) => {
        const hasSequence = Number.isFinite(event.seq);
        const isOutOfOrderBySeq = hasSequence && event.seq <= lastEventSeqRef.current;
        const isOutOfOrderByTs = !hasSequence && lastEventTsRef.current && event.ts <= lastEventTsRef.current;
        if (isOutOfOrderBySeq || isOutOfOrderByTs) {
          return;
        }

        const acceptEvent = (): void => {
          if (hasSequence) {
            lastEventSeqRef.current = event.seq;
          }
          lastEventTsRef.current = event.ts;
        };

        if (event.type === "snapshot") {
          hasSnapshotRef.current = true;
          applyDashboardPayload(event.data);
          acceptEvent();
          return;
        }

        if (!hasSnapshotRef.current) {
          return;
        }

        if (event.type === "order.updated" && event.data.order) {
          const order = event.data.order as Order;
          setOrders((prev) => sortOrders([order, ...prev.filter((row) => row.id !== order.id)]));
        }

        if (event.type === "fill.created" && event.data.fill) {
          const fill = event.data.fill as Fill;
          setFills((prev) => sortFills([fill, ...prev.filter((row) => row.id !== fill.id)]));
        }

        if (event.type === "run.updated" && event.data.run) {
          const run = event.data.run as Run;
          setRuns((prev) => sortRuns([run, ...prev.filter((row) => row.id !== run.id)]));
        }

        if (event.type === "account.updated" && event.data.accountSummary) {
          setAccountSummary(event.data.accountSummary as AccountSummary);
        }

        if (event.type === "risk.triggered" && event.data.event) {
          const riskEvent = event.data.event as RiskEvent;
          setRiskEvents((prev) => sortRiskEvents([riskEvent, ...prev.filter((row) => row.id !== riskEvent.id)]));
        }

        if (event.type === "dashboard.updated") {
          applyDashboardPayload(event.data);
        }

        acceptEvent();
      },
    });

    return () => ws.close();
  }, []);

  const value: DataContextValue = {
    marketDataProvider,
    watchlist,
    watchlistUpdatedAt,
    watchlistNextRefreshAt,
    dashboardRefreshIntervalMs: DASHBOARD_REFRESH_INTERVAL_MS,
    quotes,
    klines,
    klineTarget,
    scanResults,
    accountSummary,
    positions,
    orders,
    fills,
    strategies,
    runs,
    historyRuns,
    historyDetail,
    riskRules,
    riskEvents,
    wsStatus,
    activeRun,
    refreshDashboard,
    loadKlines,
    runScan,
    refreshOrders,
    refreshStrategiesRuns,
    refreshHistory,
    refreshRisk,
    refreshAll,
    placeOrder,
    cancelOrder,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    startRun,
    stopRun,
    loadHistoryDetail,
    updateRiskRules,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
