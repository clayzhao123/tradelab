import type { FastifyInstance } from "fastify";
import { klineSchema, quoteSchema } from "../../shared/schemas.js";
import type { MarketService } from "./market.service.js";

type RegisterMarketRoutesOptions = {
  service: MarketService;
};

export const registerMarketRoutes = async (
  app: FastifyInstance,
  options: RegisterMarketRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/market/watchlist",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 200, default: 100 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["provider", "updatedAt", "nextRefreshAt", "items"],
            properties: {
              provider: { type: "string", enum: ["mock", "real"] },
              updatedAt: { type: "string" },
              nextRefreshAt: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  required: ["symbol", "rank", "marketCapUsd"],
                  properties: {
                    symbol: { type: "string" },
                    rank: { type: "number" },
                    marketCapUsd: { type: "number" },
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
      const watchlist = await options.service.getTopUsdtWatchlist(query.limit ?? 100);
      return {
        provider: options.service.getProviderName(),
        updatedAt: watchlist.updatedAt,
        nextRefreshAt: watchlist.nextRefreshAt,
        items: watchlist.items,
      };
    },
  );

  app.get(
    "/api/v1/quotes",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            symbols: { type: "string" },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["provider", "quotes"],
            properties: {
              provider: { type: "string", enum: ["mock", "real"] },
              quotes: { type: "array", items: quoteSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { symbols?: string };
      const symbols = query.symbols
        ? query.symbols
            .split(",")
            .map((symbol) => symbol.trim().toUpperCase())
            .filter(Boolean)
        : undefined;
      const quotes = await options.service.getQuotes(symbols);
      return {
        provider: options.service.getProviderName(),
        quotes,
      };
    },
  );

  app.get(
    "/api/v1/klines",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["symbol", "timeframe"],
          properties: {
            symbol: { type: "string", minLength: 2, maxLength: 32 },
            timeframe: { type: "string", minLength: 1, maxLength: 16 },
            limit: { type: "number", minimum: 1, maximum: 500, default: 200 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["provider", "symbol", "timeframe", "klines"],
            properties: {
              provider: { type: "string", enum: ["mock", "real"] },
              symbol: { type: "string" },
              timeframe: { type: "string" },
              klines: { type: "array", items: klineSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { symbol: string; timeframe: string; limit?: number };
      const klines = await options.service.getKlines({
        symbol: query.symbol.toUpperCase(),
        timeframe: query.timeframe,
        limit: query.limit ?? 200,
      });
      return {
        provider: options.service.getProviderName(),
        symbol: query.symbol.toUpperCase(),
        timeframe: query.timeframe,
        klines,
      };
    },
  );
};
