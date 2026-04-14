import type { FastifyBaseLogger } from "fastify";
import type { MemoryDb } from "../../../db/memory-db.js";
import { env } from "../../../config/env.js";
import type { MarketProvider } from "./market-provider.js";
import { MockMarketProvider } from "./mock-market-provider.js";
import { RealMarketProvider } from "./real-market-provider.js";

export const createMarketProvider = (db: MemoryDb, logger: FastifyBaseLogger): MarketProvider => {
  const mock = new MockMarketProvider(db);
  if (env.marketDataProvider === "real") {
    return new RealMarketProvider(mock, logger);
  }
  return mock;
};

