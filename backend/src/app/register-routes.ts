import type { FastifyInstance } from "fastify";
import type { AccountService } from "../modules/account/account.service.js";
import type { AiService } from "../modules/ai/ai.service.js";
import type { HistoryService } from "../modules/history/history.service.js";
import type { BacktestService } from "../modules/backtest/backtest.service.js";
import type { MarketService } from "../modules/market/market.service.js";
import type { OrdersService } from "../modules/orders/orders.service.js";
import type { RiskService } from "../modules/risk/risk.service.js";
import type { RunsService } from "../modules/runs/runs.service.js";
import type { ScannerService } from "../modules/scanner/scanner.service.js";
import type { StrategiesService } from "../modules/strategies/strategies.service.js";
import { registerAccountRoutes } from "../modules/account/account.routes.js";
import { registerAiRoutes } from "../modules/ai/ai.routes.js";
import { registerHealthRoutes } from "../modules/health/health.routes.js";
import { registerHistoryRoutes } from "../modules/history/history.routes.js";
import { registerMarketRoutes } from "../modules/market/market.routes.js";
import { registerOrdersRoutes } from "../modules/orders/orders.routes.js";
import { registerRiskRoutes } from "../modules/risk/risk.routes.js";
import { registerRunsRoutes } from "../modules/runs/runs.routes.js";
import { registerScannerRoutes } from "../modules/scanner/scanner.routes.js";
import { registerStrategiesRoutes } from "../modules/strategies/strategies.routes.js";
import { registerSystemRoutes } from "../modules/system/system.routes.js";
import { registerBacktestRoutes } from "../modules/backtest/backtest.routes.js";

type RegisterRoutesOptions = {
  strategiesService: StrategiesService;
  aiService: AiService;
  runsService: RunsService;
  accountService: AccountService;
  marketService: MarketService;
  scannerService: ScannerService;
  ordersService: OrdersService;
  riskService: RiskService;
  historyService: HistoryService;
  backtestService: BacktestService;
};

export const registerRoutes = async (
  app: FastifyInstance,
  options: RegisterRoutesOptions,
): Promise<void> => {
  await registerHealthRoutes(app);
  await registerSystemRoutes(app);
  await registerAiRoutes(app, { service: options.aiService });
  await registerStrategiesRoutes(app, { service: options.strategiesService });
  await registerRunsRoutes(app, { service: options.runsService });
  await registerAccountRoutes(app, { service: options.accountService });
  await registerMarketRoutes(app, { service: options.marketService });
  await registerScannerRoutes(app, { service: options.scannerService });
  await registerOrdersRoutes(app, { service: options.ordersService });
  await registerRiskRoutes(app, { service: options.riskService });
  await registerHistoryRoutes(app, { service: options.historyService });
  await registerBacktestRoutes(app, { service: options.backtestService });
};
