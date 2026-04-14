const env =
  (typeof import.meta !== "undefined" ? (import.meta as ImportMeta).env ?? {} : {}) as Record<
    string,
    string | boolean | undefined
  >;

/** 开发环境默认走相对路径，由 Vite proxy 转发到后端，避免直连端口失败。 */
const rawApiBase = env.VITE_API_BASE_URL;
const API_BASE_URL =
  rawApiBase !== undefined && String(rawApiBase).length > 0
    ? String(rawApiBase).replace(/\/$/, "")
    : env.DEV
      ? ""
      : "http://localhost:3001";

const toUrl = (path: string): string => `${API_BASE_URL}${path}`;

const describeApiTarget = (): string =>
  API_BASE_URL ? API_BASE_URL : typeof window !== "undefined" ? `${window.location.origin}（经开发代理）` : "当前站点";

export type ApiErrorCategory = "validation" | "risk" | "conflict" | "not_found" | "internal";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly category: ApiErrorCategory;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(input: {
    status: number;
    code: string;
    category: ApiErrorCategory;
    message: string;
    requestId?: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "ApiError";
    this.status = input.status;
    this.code = input.code;
    this.category = input.category;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

export function toUserErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.category === "risk") {
      return `Order rejected by risk rule (${error.code}).`;
    }
    if (error.category === "validation") {
      if (error.code.startsWith("validation.ai_")) {
        return error.message;
      }
      return "Request validation failed. Please check your inputs.";
    }
    if (error.category === "not_found") {
      return "Requested resource was not found.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      return `无法连接后端 API（目标：${describeApiTarget()}）。请确认已在 tradelab/v1/backend 运行 npm run dev（默认端口 3001），或在本项目 frontend/.env 中设置正确的 VITE_API_BASE_URL。`;
    }
    return error.message;
  }

  return "Request failed";
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(toUrl(path), {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch (cause) {
    const hint = `无法连接后端 API（目标：${describeApiTarget()}）。请确认后端已启动（默认 http://127.0.0.1:3001），开发模式下也可依赖 Vite 代理（勿把 API 指到错误端口）。`;
    const err = new Error(`${hint} 原始错误：${cause instanceof Error ? cause.message : String(cause)}`);
    (err as Error & { cause?: unknown }).cause = cause;
    throw err;
  }
  if (!response.ok) {
    const rawBody = await response.text();
    let payload: unknown = null;
    try {
      payload = rawBody ? (JSON.parse(rawBody) as unknown) : null;
    } catch {
      payload = null;
    }

    if (payload && typeof payload === "object") {
      const maybe = payload as Record<string, unknown>;
      const category = maybe.category;
      const code = maybe.code;
      const message = maybe.message;
      if (
        typeof category === "string" &&
        typeof code === "string" &&
        typeof message === "string" &&
        ["validation", "risk", "conflict", "not_found", "internal"].includes(category)
      ) {
        throw new ApiError({
          status: response.status,
          category: category as ApiErrorCategory,
          code,
          message,
          requestId: typeof maybe.requestId === "string" ? maybe.requestId : undefined,
          details: maybe.details,
        });
      }
    }

    const body = rawBody || response.statusText;
    throw new Error(`${response.status} ${body}`);
  }
  if (response.status === 204) {
    return null as T;
  }
  const rawBody = await response.text();
  if (!rawBody) {
    return null as T;
  }
  return JSON.parse(rawBody) as T;
}

export type Quote = {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change24hPct: number;
  volume24h: number;
  updatedAt: string;
};

export type Kline = {
  symbol: string;
  timeframe: string;
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
};

export type ScanResult = {
  id: string;
  scanRunId: string;
  symbol: string;
  signal: "long" | "short" | "neutral";
  score: number;
  factors: {
    momentum: number;
    volume: number;
    volatility: number;
    liquidity: number;
  };
  basis: string[];
  lastPrice: number;
  change24hPct: number;
  volume24h: number;
  createdAt: string;
};

export type MarketWatchlistItem = {
  symbol: string;
  rank: number;
  marketCapUsd: number;
};

export type MarketWatchlist = {
  provider: "mock" | "real";
  updatedAt: string;
  nextRefreshAt: string;
  items: MarketWatchlistItem[];
};

export type ScanRun = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  timeframe: string;
  requestedSymbols: string[];
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type AccountSummary = {
  cashBalance: number;
  equity: number;
  buyingPower: number;
  grossExposure: number;
  netExposure: number;
  unrealizedPnl: number;
  realizedPnl: number;
  drawdownPct: number;
  updatedAt: string;
};

export type EquityPoint = {
  ts: string;
  equity: number;
  cashBalance: number;
};

export type Position = {
  symbol: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  updatedAt: string;
};

export type Order = {
  id: string;
  runId: string | null;
  strategyId: string | null;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  status: "new" | "open" | "partial" | "filled" | "cancelled" | "rejected";
  quantity: number;
  limitPrice: number | null;
  filledQuantity: number;
  avgFillPrice: number | null;
  requestedAt: string;
  openedAt: string | null;
  cancelledAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Fill = {
  id: string;
  orderId: string;
  runId: string | null;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  liquidity: "maker" | "taker";
  filledAt: string;
  createdAt: string;
};

export type Strategy = {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  params: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type StrategyFusionOrigin = "manual" | "ai_prompt" | "ai_selected";

export type AiProviderConfig = {
  provider: "minimax";
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AiFusionResult = {
  mode: "prompt" | "selected";
  provider: "minimax";
  model: string;
  totalScore: number;
  radar: {
    returnPotential: number;
    robustness: number;
    riskControl: number;
    explainability: number;
    marketFit: number;
  };
  strategyNameSuggestion: string;
  introduction: string;
  analysis: string;
  indicators: Array<{
    id: string;
    name: string;
    weight: number;
    reason: string;
  }>;
};

export type Run = {
  id: string;
  strategyId: string;
  status: "pending" | "running" | "stopped" | "completed" | "failed";
  startedAt: string | null;
  stoppedAt: string | null;
  stopReason: string | null;
  initialCash: number;
  createdAt: string;
  updatedAt: string;
};

export type RiskEvent = {
  id: string;
  runId: string | null;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  symbol: string | null;
  observedValue: number | null;
  limitValue: number | null;
  message: string;
  occurredAt: string;
};

export type RiskRules = {
  name: string;
  isEnabled: boolean;
  maxSymbolExposurePct: number;
  maxGrossExposurePct: number;
  maxDrawdownPct: number;
  minCashBalance: number;
  maxOrderNotional: number;
  updatedAt: string;
};

export type AccountSnapshot = {
  id: string;
  runId: string | null;
  source: string;
  cashBalance: number;
  equity: number;
  buyingPower: number;
  grossExposure: number;
  netExposure: number;
  unrealizedPnl: number;
  realizedPnl: number;
  drawdownPct: number;
  createdAt: string;
};

export type HistoryRunSummary = {
  runId: string;
  strategyId: string;
  status: string;
  startedAt: string | null;
  stoppedAt: string | null;
  stopReason: string | null;
  initialCash: number;
  fillsCount: number;
  riskEventsCount: number;
  turnover: number;
  fees: number;
  latestEquity: number | null;
  latestDrawdownPct: number | null;
  updatedAt: string;
};

export type HistoryRunDetail = {
  run: Run;
  summary: HistoryRunSummary;
  fills: Fill[];
  riskEvents: RiskEvent[];
  snapshots: AccountSnapshot[];
};

export type BacktestSymbolResult = {
  symbol: string;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  volatilityPct: number;
  sharpe: number;
  trades: number;
  stabilityScore: number;
  longBarsPct: number;
  shortBarsPct: number;
  flatBarsPct: number;
  longReturnPct: number;
  shortReturnPct: number;
  tradeReturnCurve: Array<{
    tradeIndex: number;
    returnPct: number;
  }>;
  equityCurve: Array<{
    ts: string;
    equity: number;
  }>;
  priceCurve: Array<{
    ts: string;
    price: number;
  }>;
  tradeMarkers: Array<{
    markerId: number;
    tradeIndex: number;
    action: "buy" | "sell";
    ts: string;
    price: number;
    linkedMarkerId: number | null;
    linkedTs: string | null;
    linkedPrice: number | null;
  }>;
};

export type BacktestResult = {
  backtestRunId: string;
  generatedAt: string;
  strategy: {
    id: string | null;
    name: string;
    params: Record<string, unknown>;
    factorWeights: {
      trend: number;
      momentum: number;
      meanReversion: number;
      volatility: number;
      volume: number;
      structure: number;
    };
    decisionThreshold: {
      mode: "aggressive" | "neutral" | "conservative";
      long: number;
      short: number;
      quantile: number;
      source: "auto_composite_quantile" | "fallback";
      sampleSize: number;
    };
  };
  timeframe: string;
  lookbackBars: number;
  initialCapital: number;
  symbols: string[];
  results: BacktestSymbolResult[];
  portfolio: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    volatilityPct: number;
    sharpe: number;
    avgStabilityScore: number;
    longBarsPct: number;
    shortBarsPct: number;
    flatBarsPct: number;
    longReturnPct: number;
    shortReturnPct: number;
    bestSymbol: string | null;
    worstSymbol: string | null;
    equityCurve: Array<{
      ts: string;
      equity: number;
    }>;
  };
};

export type BacktestHistorySummary = {
  id: string;
  generatedAt: string;
  strategyId: string | null;
  strategyName: string | null;
  timeframe: string;
  lookbackBars: number;
  initialCapital: number;
  symbolsCount: number;
  portfolio: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpe: number;
  };
};

export type BacktestHistoryDetail = BacktestResult & {
  id: string;
  requestSnapshot: {
    strategyId: string | null;
    symbols: string[];
    timeframe: string;
    lookbackBars: number;
    initialCapital: number;
    decisionMode: "aggressive" | "neutral" | "conservative";
  };
};

export const api = {
  getMarketWatchlist: async (limit = 100): Promise<MarketWatchlist> =>
    requestJson<MarketWatchlist>(`/api/v1/market/watchlist?limit=${limit}`),
  getQuotes: async (symbols?: string[]): Promise<Quote[]> => {
    const query = symbols && symbols.length > 0 ? `?symbols=${symbols.join(",")}` : "";
    const data = await requestJson<{ provider: string; quotes: Quote[] }>(`/api/v1/quotes${query}`);
    return data.quotes;
  },
  getKlines: async (symbol: string, timeframe = "15m", limit = 80): Promise<Kline[]> => {
    const data = await requestJson<{ provider: string; symbol: string; timeframe: string; klines: Kline[] }>(
      `/api/v1/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`,
    );
    return data.klines;
  },
  getScanResults: async (limit = 30): Promise<ScanResult[]> => {
    const data = await requestJson<{ results: ScanResult[] }>(`/api/v1/scan/results?limit=${limit}`);
    return data.results;
  },
  runScan: async (symbols: string[], timeframe = "15m") =>
    requestJson<{ scanRun: ScanRun; results: ScanResult[] }>("/api/v1/scan/run", {
      method: "POST",
      body: JSON.stringify({ symbols, timeframe }),
    }),
  getAccountSummary: async (): Promise<AccountSummary> => requestJson<AccountSummary>("/api/v1/account/summary"),
  getAccountEquity: async (limit = 100): Promise<EquityPoint[]> => {
    const data = await requestJson<{ points: EquityPoint[] }>(`/api/v1/account/equity?limit=${limit}`);
    return data.points;
  },
  getPositions: async (): Promise<Position[]> => {
    const data = await requestJson<{ positions: Position[] }>("/api/v1/account/positions");
    return data.positions;
  },
  getOrders: async (input?: {
    limit?: number;
    status?: "new" | "open" | "partial" | "filled" | "cancelled" | "rejected";
    symbol?: string;
  }): Promise<Order[]> => {
    const params = new URLSearchParams();
    params.set("limit", String(input?.limit ?? 100));
    if (input?.status) {
      params.set("status", input.status);
    }
    if (input?.symbol) {
      params.set("symbol", input.symbol.toUpperCase());
    }
    const data = await requestJson<{ orders: Order[] }>(`/api/v1/orders?${params.toString()}`);
    return data.orders;
  },
  createOrder: async (input: {
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit";
    quantity: number;
    limitPrice?: number;
    strategyId?: string;
    runId?: string;
  }): Promise<{ order: Order; fill: Fill | null }> =>
    requestJson<{ order: Order; fill: Fill | null }>("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancelOrder: async (orderId: string): Promise<Order> => {
    const data = await requestJson<{ order: Order }>(`/api/v1/orders/${orderId}`, { method: "DELETE" });
    return data.order;
  },
  getFills: async (input?: { limit?: number; symbol?: string; orderId?: string }): Promise<Fill[]> => {
    const params = new URLSearchParams();
    params.set("limit", String(input?.limit ?? 100));
    if (input?.symbol) {
      params.set("symbol", input.symbol.toUpperCase());
    }
    if (input?.orderId) {
      params.set("orderId", input.orderId);
    }
    const data = await requestJson<{ fills: Fill[] }>(`/api/v1/fills?${params.toString()}`);
    return data.fills;
  },
  getStrategies: async (): Promise<Strategy[]> => requestJson<Strategy[]>("/api/v1/strategies"),
  createStrategy: async (input: {
    name: string;
    description: string;
    params: Record<string, unknown>;
    isEnabled?: boolean;
  }): Promise<Strategy> =>
    requestJson<Strategy>("/api/v1/strategies", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateStrategy: async (
    id: string,
    patch: Partial<{ name: string; description: string; params: Record<string, unknown>; isEnabled: boolean }>,
  ): Promise<Strategy> =>
    requestJson<Strategy>(`/api/v1/strategies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteStrategy: async (id: string): Promise<void> => {
    await requestJson<null>(`/api/v1/strategies/${id}`, {
      method: "DELETE",
    });
  },
  getRuns: async (): Promise<Run[]> => requestJson<Run[]>("/api/v1/runs"),
  startRun: async (input: { strategyId: string; initialCash: number }): Promise<Run> =>
    requestJson<Run>("/api/v1/runs/start", { method: "POST", body: JSON.stringify(input) }),
  stopRun: async (runId: string, stopReason: string): Promise<Run> =>
    requestJson<Run>(`/api/v1/runs/${runId}/stop`, {
      method: "POST",
      body: JSON.stringify({ stopReason }),
    }),
  getHistoryRuns: async (limit = 100): Promise<HistoryRunSummary[]> => {
    const data = await requestJson<{ runs: HistoryRunSummary[] }>(`/api/v1/history/runs?limit=${limit}`);
    return data.runs;
  },
  getHistoryRunDetail: async (runId: string): Promise<HistoryRunDetail> =>
    requestJson<HistoryRunDetail>(
      `/api/v1/history/runs/${runId}?fillsLimit=500&eventsLimit=500&snapshotsLimit=1000&snapshotSampleEvery=2`,
    ),
  getRiskRules: async (): Promise<RiskRules> => requestJson<RiskRules>("/api/v1/risk/rules"),
  updateRiskRules: async (
    patch: Partial<
      Pick<
        RiskRules,
        | "name"
        | "isEnabled"
        | "maxSymbolExposurePct"
        | "maxGrossExposurePct"
        | "maxDrawdownPct"
        | "minCashBalance"
        | "maxOrderNotional"
      >
    >,
  ): Promise<RiskRules> =>
    requestJson<RiskRules>("/api/v1/risk/rules", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  getRiskEvents: async (input?: {
    limit?: number;
    severity?: "info" | "warning" | "critical";
    runId?: string;
  }): Promise<RiskEvent[]> => {
    const params = new URLSearchParams();
    params.set("limit", String(input?.limit ?? 100));
    if (input?.severity) {
      params.set("severity", input.severity);
    }
    if (input?.runId) {
      params.set("runId", input.runId);
    }
    const data = await requestJson<{ events: RiskEvent[] }>(`/api/v1/risk/events?${params.toString()}`);
    return data.events;
  },
  runBacktest: async (input: {
    strategyId?: string;
    symbols: string[];
    timeframe: string;
    lookbackBars: number;
    initialCapital: number;
    decisionMode?: "aggressive" | "neutral" | "conservative";
  }): Promise<BacktestResult> =>
    requestJson<BacktestResult>("/api/v1/backtest/run", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getBacktestHistory: async (limit = 50): Promise<BacktestHistorySummary[]> => {
    const data = await requestJson<{ items: BacktestHistorySummary[] }>(`/api/v1/backtest/history?limit=${limit}`);
    return data.items;
  },
  getBacktestHistoryDetail: async (id: string): Promise<BacktestHistoryDetail> =>
    requestJson<BacktestHistoryDetail>(`/api/v1/backtest/history/${id}`),
  deleteBacktestHistory: async (id: string): Promise<void> => {
    await requestJson<null>(`/api/v1/backtest/history/${id}`, { method: "DELETE" });
  },
  getAiConfig: async (): Promise<AiProviderConfig> =>
    requestJson<AiProviderConfig>("/api/v1/ai/config"),
  updateAiConfig: async (input: {
    provider: "minimax";
    model: string;
    apiKey?: string;
  }): Promise<AiProviderConfig> =>
    requestJson<AiProviderConfig>("/api/v1/ai/config", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  generateAiFusion: async (input: {
    mode: "prompt" | "selected";
    prompt?: string;
    selectedIndicators?: Array<{
      id: string;
      name: string;
      family?: string;
      labels?: string[];
      weight?: number;
    }>;
    indicatorPool?: Array<{
      id: string;
      name: string;
      family?: string;
      description?: string;
      labels?: string[];
    }>;
  }): Promise<AiFusionResult> =>
    requestJson<AiFusionResult>("/api/v1/ai/fusion/generate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
