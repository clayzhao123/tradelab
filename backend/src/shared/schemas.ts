export const errorResponseSchema = {
  type: "object",
  required: ["error", "message", "code", "category", "requestId"],
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    code: { type: "string" },
    category: { type: "string", enum: ["validation", "risk", "conflict", "not_found", "internal"] },
    requestId: { type: "string" },
    details: {
      anyOf: [
        { type: "array", items: { type: "object", additionalProperties: true } },
        { type: "object", additionalProperties: true },
      ],
    },
  },
  additionalProperties: false,
} as const;

export const strategySchema = {
  type: "object",
  required: ["id", "name", "description", "isEnabled", "params", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    isEnabled: { type: "boolean" },
    params: { type: "object", additionalProperties: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const runSchema = {
  type: "object",
  required: [
    "id",
    "strategyId",
    "status",
    "startedAt",
    "stoppedAt",
    "stopReason",
    "initialCash",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    strategyId: { type: "string" },
    status: { type: "string", enum: ["pending", "running", "stopped", "completed", "failed"] },
    startedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    stoppedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    stopReason: { anyOf: [{ type: "string" }, { type: "null" }] },
    initialCash: { type: "number" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const accountSummarySchema = {
  type: "object",
  required: [
    "cashBalance",
    "equity",
    "buyingPower",
    "grossExposure",
    "netExposure",
    "unrealizedPnl",
    "realizedPnl",
    "drawdownPct",
    "updatedAt",
  ],
  properties: {
    cashBalance: { type: "number" },
    equity: { type: "number" },
    buyingPower: { type: "number" },
    grossExposure: { type: "number" },
    netExposure: { type: "number" },
    unrealizedPnl: { type: "number" },
    realizedPnl: { type: "number" },
    drawdownPct: { type: "number" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const quoteSchema = {
  type: "object",
  required: ["symbol", "bid", "ask", "last", "change24hPct", "volume24h", "updatedAt"],
  properties: {
    symbol: { type: "string" },
    bid: { type: "number" },
    ask: { type: "number" },
    last: { type: "number" },
    change24hPct: { type: "number" },
    volume24h: { type: "number" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const klineSchema = {
  type: "object",
  required: ["symbol", "timeframe", "openTime", "closeTime", "open", "high", "low", "close", "volume", "trades"],
  properties: {
    symbol: { type: "string" },
    timeframe: { type: "string" },
    openTime: { type: "string" },
    closeTime: { type: "string" },
    open: { type: "number" },
    high: { type: "number" },
    low: { type: "number" },
    close: { type: "number" },
    volume: { type: "number" },
    trades: { type: "number" },
  },
  additionalProperties: false,
} as const;

export const positionSchema = {
  type: "object",
  required: ["symbol", "quantity", "avgCost", "marketPrice", "marketValue", "unrealizedPnl", "realizedPnl", "updatedAt"],
  properties: {
    symbol: { type: "string" },
    quantity: { type: "number" },
    avgCost: { type: "number" },
    marketPrice: { type: "number" },
    marketValue: { type: "number" },
    unrealizedPnl: { type: "number" },
    realizedPnl: { type: "number" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const equityPointSchema = {
  type: "object",
  required: ["ts", "equity", "cashBalance"],
  properties: {
    ts: { type: "string" },
    equity: { type: "number" },
    cashBalance: { type: "number" },
  },
  additionalProperties: false,
} as const;

export const scanRunSchema = {
  type: "object",
  required: [
    "id",
    "status",
    "timeframe",
    "requestedSymbols",
    "startedAt",
    "completedAt",
    "errorMessage",
    "createdAt",
  ],
  properties: {
    id: { type: "string" },
    status: { type: "string", enum: ["queued", "running", "completed", "failed"] },
    timeframe: { type: "string" },
    requestedSymbols: { type: "array", items: { type: "string" } },
    startedAt: { type: "string" },
    completedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    errorMessage: { anyOf: [{ type: "string" }, { type: "null" }] },
    createdAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const scanResultSchema = {
  type: "object",
  required: [
    "id",
    "scanRunId",
    "symbol",
    "signal",
    "score",
    "factors",
    "basis",
    "lastPrice",
    "change24hPct",
    "volume24h",
    "createdAt",
  ],
  properties: {
    id: { type: "string" },
    scanRunId: { type: "string" },
    symbol: { type: "string" },
    signal: { type: "string", enum: ["long", "short", "neutral"] },
    score: { type: "number" },
    factors: {
      type: "object",
      required: ["momentum", "volume", "volatility", "liquidity"],
      properties: {
        momentum: { type: "number" },
        volume: { type: "number" },
        volatility: { type: "number" },
        liquidity: { type: "number" },
      },
      additionalProperties: false,
    },
    basis: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
    lastPrice: { type: "number" },
    change24hPct: { type: "number" },
    volume24h: { type: "number" },
    createdAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const orderSchema = {
  type: "object",
  required: [
    "id",
    "runId",
    "strategyId",
    "symbol",
    "side",
    "type",
    "status",
    "quantity",
    "limitPrice",
    "filledQuantity",
    "avgFillPrice",
    "requestedAt",
    "openedAt",
    "cancelledAt",
    "rejectedReason",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    runId: { anyOf: [{ type: "string" }, { type: "null" }] },
    strategyId: { anyOf: [{ type: "string" }, { type: "null" }] },
    symbol: { type: "string" },
    side: { type: "string", enum: ["buy", "sell"] },
    type: { type: "string", enum: ["market", "limit"] },
    status: { type: "string", enum: ["new", "open", "partial", "filled", "cancelled", "rejected"] },
    quantity: { type: "number" },
    limitPrice: { anyOf: [{ type: "number" }, { type: "null" }] },
    filledQuantity: { type: "number" },
    avgFillPrice: { anyOf: [{ type: "number" }, { type: "null" }] },
    requestedAt: { type: "string" },
    openedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    cancelledAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    rejectedReason: { anyOf: [{ type: "string" }, { type: "null" }] },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const fillSchema = {
  type: "object",
  required: [
    "id",
    "orderId",
    "runId",
    "symbol",
    "side",
    "quantity",
    "price",
    "fee",
    "liquidity",
    "filledAt",
    "createdAt",
  ],
  properties: {
    id: { type: "string" },
    orderId: { type: "string" },
    runId: { anyOf: [{ type: "string" }, { type: "null" }] },
    symbol: { type: "string" },
    side: { type: "string", enum: ["buy", "sell"] },
    quantity: { type: "number" },
    price: { type: "number" },
    fee: { type: "number" },
    liquidity: { type: "string", enum: ["maker", "taker"] },
    filledAt: { type: "string" },
    createdAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const riskRulesSchema = {
  type: "object",
  required: [
    "name",
    "isEnabled",
    "maxSymbolExposurePct",
    "maxGrossExposurePct",
    "maxDrawdownPct",
    "minCashBalance",
    "maxOrderNotional",
    "updatedAt",
  ],
  properties: {
    name: { type: "string" },
    isEnabled: { type: "boolean" },
    maxSymbolExposurePct: { type: "number" },
    maxGrossExposurePct: { type: "number" },
    maxDrawdownPct: { type: "number" },
    minCashBalance: { type: "number" },
    maxOrderNotional: { type: "number" },
    updatedAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const riskEventSchema = {
  type: "object",
  required: ["id", "runId", "ruleName", "severity", "symbol", "observedValue", "limitValue", "message", "occurredAt"],
  properties: {
    id: { type: "string" },
    runId: { anyOf: [{ type: "string" }, { type: "null" }] },
    ruleName: { type: "string" },
    severity: { type: "string", enum: ["info", "warning", "critical"] },
    symbol: { anyOf: [{ type: "string" }, { type: "null" }] },
    observedValue: { anyOf: [{ type: "number" }, { type: "null" }] },
    limitValue: { anyOf: [{ type: "number" }, { type: "null" }] },
    message: { type: "string" },
    occurredAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const accountSnapshotSchema = {
  type: "object",
  required: [
    "id",
    "runId",
    "source",
    "cashBalance",
    "equity",
    "buyingPower",
    "grossExposure",
    "netExposure",
    "unrealizedPnl",
    "realizedPnl",
    "drawdownPct",
    "createdAt",
  ],
  properties: {
    id: { type: "string" },
    runId: { anyOf: [{ type: "string" }, { type: "null" }] },
    source: {
      type: "string",
      enum: ["startup", "interval", "fill", "risk_event", "run_start", "run_stop", "manual"],
    },
    cashBalance: { type: "number" },
    equity: { type: "number" },
    buyingPower: { type: "number" },
    grossExposure: { type: "number" },
    netExposure: { type: "number" },
    unrealizedPnl: { type: "number" },
    realizedPnl: { type: "number" },
    drawdownPct: { type: "number" },
    createdAt: { type: "string" },
  },
  additionalProperties: false,
} as const;
