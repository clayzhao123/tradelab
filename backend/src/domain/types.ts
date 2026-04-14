export type Strategy = {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  params: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type RunStatus = "pending" | "running" | "stopped" | "completed" | "failed";

export type Run = {
  id: string;
  strategyId: string;
  status: RunStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  stopReason: string | null;
  initialCash: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "new" | "open" | "partial" | "filled" | "cancelled" | "rejected";

export type Order = {
  id: string;
  runId: string | null;
  strategyId: string | null;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
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
  side: OrderSide;
  quantity: number;
  price: number;
  fee: number;
  liquidity: "maker" | "taker";
  filledAt: string;
  createdAt: string;
};

export type RiskSeverity = "info" | "warning" | "critical";

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

export type RiskEvent = {
  id: string;
  runId: string | null;
  ruleName: string;
  severity: RiskSeverity;
  symbol: string | null;
  observedValue: number | null;
  limitValue: number | null;
  message: string;
  occurredAt: string;
};

export type SnapshotSource = "startup" | "interval" | "fill" | "risk_event" | "run_start" | "run_stop" | "manual";

export type AccountSnapshot = {
  id: string;
  runId: string | null;
  source: SnapshotSource;
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

export type EquityPoint = {
  ts: string;
  equity: number;
  cashBalance: number;
};

export type ScanRunStatus = "queued" | "running" | "completed" | "failed";

export type ScanRun = {
  id: string;
  status: ScanRunStatus;
  timeframe: string;
  requestedSymbols: string[];
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
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
