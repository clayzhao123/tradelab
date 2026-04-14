export type BacktestFactor = "trend" | "momentum" | "meanReversion" | "volatility" | "volume" | "structure";
export type DecisionMode = "aggressive" | "neutral" | "conservative";

export type FactorWeights = Record<BacktestFactor, number>;

export type BacktestInput = {
  strategyId?: string;
  symbols: string[];
  timeframe: string;
  lookbackBars: number;
  initialCapital: number;
  decisionMode?: DecisionMode;
};

export type EquityPoint = {
  ts: string;
  equity: number;
};

export type PricePoint = {
  ts: string;
  price: number;
};

export type TradeMarker = {
  markerId: number;
  tradeIndex: number;
  action: "buy" | "sell";
  ts: string;
  price: number;
  linkedMarkerId: number | null;
  linkedTs: string | null;
  linkedPrice: number | null;
};

export type SymbolBacktestResult = {
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
  equityCurve: EquityPoint[];
  priceCurve: PricePoint[];
  tradeMarkers: TradeMarker[];
};

export type DecisionThreshold = {
  mode: DecisionMode;
  long: number;
  short: number;
  quantile: number;
  source: "auto_composite_quantile" | "fallback";
  sampleSize: number;
};

export type BacktestComputedResult = {
  generatedAt: string;
  strategy: {
    id: string | null;
    name: string;
    params: Record<string, unknown>;
    factorWeights: FactorWeights;
    decisionThreshold: DecisionThreshold;
  };
  timeframe: string;
  lookbackBars: number;
  initialCapital: number;
  symbols: string[];
  results: SymbolBacktestResult[];
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
    equityCurve: EquityPoint[];
  };
};

export type BacktestRunResult = BacktestComputedResult & {
  backtestRunId: string;
};

export type BacktestRequestSnapshot = {
  strategyId: string | null;
  symbols: string[];
  timeframe: string;
  lookbackBars: number;
  initialCapital: number;
  decisionMode: DecisionMode;
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

export type BacktestHistoryDetail = BacktestRunResult & {
  id: string;
  requestSnapshot: BacktestRequestSnapshot;
};
