import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";
import { MemoryDb } from "../db/memory-db.js";
import { createOptionalPostgresClient } from "../db/postgres-client.js";
import { AiService } from "../modules/ai/ai.service.js";
import { registerErrorHandler } from "./error-handler.js";
import { registerRoutes } from "./register-routes.js";
import { StrategiesService } from "../modules/strategies/strategies.service.js";
import { RunsService } from "../modules/runs/runs.service.js";
import { AccountService } from "../modules/account/account.service.js";
import { registerWebSocketGateway } from "../modules/ws/websocket-gateway.js";
import { createMarketProvider } from "../modules/market/providers/create-market-provider.js";
import { MarketService } from "../modules/market/market.service.js";
import { ScannerService } from "../modules/scanner/scanner.service.js";
import { EventHub } from "../modules/ws/event-hub.js";
import { OrdersService } from "../modules/orders/orders.service.js";
import { RiskService } from "../modules/risk/risk.service.js";
import { HistoryService } from "../modules/history/history.service.js";
import { BacktestService } from "../modules/backtest/backtest.service.js";
import { FileAiSettingsRepository, MemoryAiSettingsRepository, PostgresAiSettingsRepository } from "../repositories/ai-settings.repository.js";
import { FileBacktestRepository, MemoryBacktestRepository, PostgresBacktestRepository } from "../repositories/backtest.repository.js";
import { FileStrategyRepository, MemoryStrategyRepository, PostgresStrategyRepository } from "../repositories/strategy.repository.js";
import { getRequestContext } from "./request-context.js";

type AppContext = {
  app: FastifyInstance;
  shutdown: () => Promise<void>;
};

export const createApp = async (): Promise<AppContext> => {
  const app = Fastify({
    logger: true,
  });

  const backendRootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const aiSettingsFilePath = resolve(backendRootDir, ".data", "ai-provider-settings.json");
  const strategyFilePath = resolve(backendRootDir, ".data", "strategies.json");
  const backtestHistoryFilePath = resolve(backendRootDir, ".data", "backtest-history.json");
  const useFileFallback = env.nodeEnv !== "test";

  const db = new MemoryDb();
  const postgresClient = await createOptionalPostgresClient(env.databaseUrl, app.log);
  const strategyRepository = postgresClient
    ? new PostgresStrategyRepository(postgresClient)
    : useFileFallback
      ? new FileStrategyRepository(strategyFilePath)
      : new MemoryStrategyRepository(db);
  const aiSettingsRepository = postgresClient
    ? new PostgresAiSettingsRepository(postgresClient)
    : useFileFallback
      ? new FileAiSettingsRepository(aiSettingsFilePath)
      : new MemoryAiSettingsRepository();
  const backtestRepository = postgresClient
    ? new PostgresBacktestRepository(postgresClient)
    : useFileFallback
      ? new FileBacktestRepository(backtestHistoryFilePath)
      : new MemoryBacktestRepository();
  const eventHub = new EventHub();
  const aiService = new AiService(aiSettingsRepository);
  const strategiesService = new StrategiesService(strategyRepository, db);
  const accountService = new AccountService(db);
  const runsService = new RunsService(db, strategyRepository, eventHub, accountService);
  const marketProvider = createMarketProvider(db, app.log);
  const marketService = new MarketService(marketProvider);
  const scannerService = new ScannerService(db, marketService);
  const riskService = new RiskService(db, eventHub);
  const ordersService = new OrdersService(db, marketService, accountService, eventHub, riskService);
  const historyService = new HistoryService(db);
  const backtestService = new BacktestService(strategyRepository, backtestRepository, marketService);

  const existingStrategies = await strategyRepository.list();
  if (existingStrategies.length === 0) {
    await strategyRepository.create({
      name: "Momentum Breakout",
      description: "Default foundation strategy",
      isEnabled: true,
      params: { timeframe: "15m", riskPct: 0.02 },
    });
  }

  await app.register(cors, { origin: true });

  app.addHook("onRequest", async (request) => {
    request.log.info(
      {
        event: "http.request.received",
        ...getRequestContext(request),
        method: request.method,
        url: request.url,
      },
      "request received",
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        event: "http.request.completed",
        ...getRequestContext(request),
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: reply.elapsedTime,
      },
      "request completed",
    );
  });

  registerErrorHandler(app);

  await registerRoutes(app, {
    strategiesService,
    aiService,
    runsService,
    accountService,
    marketService,
    scannerService,
    ordersService,
    riskService,
    historyService,
    backtestService,
  });

  const disposeWebSocket = registerWebSocketGateway({
    app,
    path: env.wsPath,
    heartbeatIntervalMs: env.wsHeartbeatIntervalMs,
    accountService,
    marketService,
    scannerService,
    runsService,
    eventHub,
  });

  const shutdown = async (): Promise<void> => {
    disposeWebSocket();
    await app.close();
    if (postgresClient) {
      await postgresClient.close();
    }
  };

  return { app, shutdown };
};
