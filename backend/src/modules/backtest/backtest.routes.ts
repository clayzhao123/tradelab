import type { FastifyInstance } from "fastify";
import { notFoundError } from "../../shared/app-error.js";
import type { BacktestService } from "./backtest.service.js";

type RegisterBacktestRoutesOptions = {
  service: BacktestService;
};

export const registerBacktestRoutes = async (
  app: FastifyInstance,
  options: RegisterBacktestRoutesOptions,
): Promise<void> => {
  app.post(
    "/api/v1/backtest/run",
    {
      schema: {
        body: {
          type: "object",
          required: ["symbols", "timeframe"],
          properties: {
            strategyId: { type: "string", minLength: 1 },
            symbols: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: { type: "string", minLength: 2, maxLength: 32 },
            },
            timeframe: { type: "string", minLength: 1, maxLength: 16 },
            lookbackBars: { type: "number", minimum: 12, maximum: 2000, default: 365 },
            initialCapital: { type: "number", minimum: 100, maximum: 100000000, default: 10000 },
            decisionMode: { type: "string", enum: ["aggressive", "neutral", "conservative"] },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["backtestRunId", "generatedAt", "strategy", "timeframe", "lookbackBars", "initialCapital", "symbols", "results", "portfolio"],
            properties: {
              backtestRunId: { type: "string" },
              generatedAt: { type: "string" },
              strategy: {
                type: "object",
                required: ["id", "name", "params", "factorWeights", "decisionThreshold"],
                properties: {
                  id: { anyOf: [{ type: "string" }, { type: "null" }] },
                  name: { type: "string" },
                  params: { type: "object", additionalProperties: true },
                  factorWeights: {
                    type: "object",
                    required: ["trend", "momentum", "meanReversion", "volatility", "volume", "structure"],
                    properties: {
                      trend: { type: "number" },
                      momentum: { type: "number" },
                      meanReversion: { type: "number" },
                      volatility: { type: "number" },
                      volume: { type: "number" },
                      structure: { type: "number" },
                    },
                    additionalProperties: false,
                  },
                  decisionThreshold: {
                    type: "object",
                    required: ["mode", "long", "short", "quantile", "source", "sampleSize"],
                    properties: {
                      mode: { type: "string", enum: ["aggressive", "neutral", "conservative"] },
                      long: { type: "number" },
                      short: { type: "number" },
                      quantile: { type: "number" },
                      source: { type: "string", enum: ["auto_composite_quantile", "fallback"] },
                      sampleSize: { type: "number" },
                    },
                    additionalProperties: false,
                  },
                },
                additionalProperties: false,
              },
              timeframe: { type: "string" },
              lookbackBars: { type: "number" },
              initialCapital: { type: "number" },
              symbols: { type: "array", items: { type: "string" } },
              results: {
                type: "array",
                items: {
                  type: "object",
                  required: [
                    "symbol",
                    "totalReturnPct",
                    "maxDrawdownPct",
                    "winRatePct",
                    "volatilityPct",
                    "sharpe",
                    "trades",
                    "stabilityScore",
                    "longBarsPct",
                    "shortBarsPct",
                    "flatBarsPct",
                    "longReturnPct",
                    "shortReturnPct",
                    "tradeReturnCurve",
                    "equityCurve",
                    "priceCurve",
                    "tradeMarkers",
                  ],
                  properties: {
                    symbol: { type: "string" },
                    totalReturnPct: { type: "number" },
                    maxDrawdownPct: { type: "number" },
                    winRatePct: { type: "number" },
                    volatilityPct: { type: "number" },
                    sharpe: { type: "number" },
                    trades: { type: "number" },
                    stabilityScore: { type: "number" },
                    longBarsPct: { type: "number" },
                    shortBarsPct: { type: "number" },
                    flatBarsPct: { type: "number" },
                    longReturnPct: { type: "number" },
                    shortReturnPct: { type: "number" },
                    tradeReturnCurve: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["tradeIndex", "returnPct"],
                        properties: {
                          tradeIndex: { type: "number" },
                          returnPct: { type: "number" },
                        },
                        additionalProperties: false,
                      },
                    },
                    equityCurve: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["ts", "equity"],
                        properties: {
                          ts: { type: "string" },
                          equity: { type: "number" },
                        },
                        additionalProperties: false,
                      },
                    },
                    priceCurve: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["ts", "price"],
                        properties: {
                          ts: { type: "string" },
                          price: { type: "number" },
                        },
                        additionalProperties: false,
                      },
                    },
                    tradeMarkers: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["markerId", "tradeIndex", "action", "ts", "price", "linkedMarkerId", "linkedTs", "linkedPrice"],
                        properties: {
                          markerId: { type: "number" },
                          tradeIndex: { type: "number" },
                          action: { type: "string", enum: ["buy", "sell"] },
                          ts: { type: "string" },
                          price: { type: "number" },
                          linkedMarkerId: { anyOf: [{ type: "number" }, { type: "null" }] },
                          linkedTs: { anyOf: [{ type: "string" }, { type: "null" }] },
                          linkedPrice: { anyOf: [{ type: "number" }, { type: "null" }] },
                        },
                        additionalProperties: false,
                      },
                    },
                  },
                  additionalProperties: false,
                },
              },
              portfolio: {
                type: "object",
                required: [
                  "totalReturnPct",
                  "maxDrawdownPct",
                  "winRatePct",
                  "volatilityPct",
                  "sharpe",
                  "avgStabilityScore",
                  "longBarsPct",
                  "shortBarsPct",
                  "flatBarsPct",
                  "longReturnPct",
                  "shortReturnPct",
                  "bestSymbol",
                  "worstSymbol",
                  "equityCurve",
                ],
                properties: {
                  totalReturnPct: { type: "number" },
                  maxDrawdownPct: { type: "number" },
                  winRatePct: { type: "number" },
                  volatilityPct: { type: "number" },
                  sharpe: { type: "number" },
                  avgStabilityScore: { type: "number" },
                  longBarsPct: { type: "number" },
                  shortBarsPct: { type: "number" },
                  flatBarsPct: { type: "number" },
                  longReturnPct: { type: "number" },
                  shortReturnPct: { type: "number" },
                  bestSymbol: { anyOf: [{ type: "string" }, { type: "null" }] },
                  worstSymbol: { anyOf: [{ type: "string" }, { type: "null" }] },
                  equityCurve: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["ts", "equity"],
                      properties: {
                        ts: { type: "string" },
                        equity: { type: "number" },
                      },
                      additionalProperties: false,
                    },
                  },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const body = request.body as {
        strategyId?: string;
        symbols: string[];
        timeframe: string;
        lookbackBars?: number;
        initialCapital?: number;
        decisionMode?: "aggressive" | "neutral" | "conservative";
      };
      return options.service.run({
        strategyId: body.strategyId,
        symbols: body.symbols,
        timeframe: body.timeframe,
        lookbackBars: body.lookbackBars ?? 365,
        initialCapital: body.initialCapital ?? 10000,
        decisionMode: body.decisionMode,
      });
    },
  );

  app.get(
    "/api/v1/backtest/history",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 200, default: 50 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["items"],
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  required: [
                    "id",
                    "generatedAt",
                    "strategyId",
                    "strategyName",
                    "timeframe",
                    "lookbackBars",
                    "initialCapital",
                    "symbolsCount",
                    "portfolio",
                  ],
                  properties: {
                    id: { type: "string" },
                    generatedAt: { type: "string" },
                    strategyId: { anyOf: [{ type: "string" }, { type: "null" }] },
                    strategyName: { anyOf: [{ type: "string" }, { type: "null" }] },
                    timeframe: { type: "string" },
                    lookbackBars: { type: "number" },
                    initialCapital: { type: "number" },
                    symbolsCount: { type: "number" },
                    portfolio: {
                      type: "object",
                      required: ["totalReturnPct", "maxDrawdownPct", "sharpe"],
                      properties: {
                        totalReturnPct: { type: "number" },
                        maxDrawdownPct: { type: "number" },
                        sharpe: { type: "number" },
                      },
                      additionalProperties: false,
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { limit?: number };
      const items = await options.service.listHistory(query.limit ?? 50);
      return { items };
    },
  );

  app.get(
    "/api/v1/backtest/history/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const params = request.params as { id: string };
      const detail = await options.service.getHistoryDetail(params.id);
      if (!detail) {
        throw notFoundError("not_found.backtest_history", `Backtest history ${params.id} does not exist`, {
          backtestRunId: params.id,
        });
      }
      return detail;
    },
  );

  app.delete(
    "/api/v1/backtest/history/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
        response: {
          204: { type: "null" },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      await options.service.deleteHistory(params.id);
      reply.code(204);
      return null;
    },
  );
};
