import assert from "node:assert/strict";
import { MemoryDb } from "../db/memory-db.js";

process.env.NODE_ENV = "test";

const { createApp } = await import("../app/create-app.js");

const testValidationErrorShape = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/strategies",
      payload: {
        name: "x",
        description: "short",
        params: {},
      },
    });

    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(body.error, "Bad Request");
    assert.equal(body.message, "Request validation failed");
    assert.equal(body.category, "validation");
    assert.equal(body.code, "validation.request_invalid");
    assert.ok(typeof body.requestId === "string");
    assert.ok(Array.isArray(body.details));
  } finally {
    await shutdown();
  }
};

const testStrategyCrudFlow = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/strategies",
      payload: {
        name: "RSI Mean Reversion",
        description: "Buy oversold conditions",
        params: { timeframe: "5m", rsiLower: 30 },
      },
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/strategies/${created.id}`,
      payload: {
        description: "Buy oversold conditions with tighter exits",
      },
    });

    assert.equal(patchResponse.statusCode, 200);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/strategies",
    });

    assert.equal(listResponse.statusCode, 200);
    const strategies = listResponse.json();
    assert.ok(strategies.some((item: { id: string }) => item.id === created.id));
  } finally {
    await shutdown();
  }
};

const testStrategyDeleteFlow = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/strategies",
      payload: {
        name: "Delete Candidate",
        description: "Temporary strategy for delete path",
        params: { timeframe: "1h" },
      },
    });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/strategies/${created.id}`,
    });
    assert.equal(deleteResponse.statusCode, 204);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/strategies",
    });
    const list = listResponse.json();
    assert.ok(!list.some((row: { id: string }) => row.id === created.id));
  } finally {
    await shutdown();
  }
};

const testTransactionRollback = async (): Promise<void> => {
  const db = new MemoryDb();
  const before = await db.read((tx) => tx.listStrategies().length);

  let rolledBack = false;
  try {
    await db.withTransaction(async (tx) => {
      tx.createStrategy({
        name: "Temp Strategy",
        description: "Should rollback",
        isEnabled: true,
        params: {},
      });
      throw new Error("force_rollback");
    });
  } catch (error) {
    if (error instanceof Error && error.message === "force_rollback") {
      rolledBack = true;
    } else {
      throw error;
    }
  }

  assert.equal(rolledBack, true);
  const after = await db.read((tx) => tx.listStrategies().length);
  assert.equal(after, before);
};

const testMarketAndScannerFlow = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const quotesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/quotes?symbols=BTCUSDT,ETHUSDT",
    });
    assert.equal(quotesResponse.statusCode, 200);
    const quotesBody = quotesResponse.json();
    assert.ok(["mock", "real"].includes(quotesBody.provider));
    assert.equal(quotesBody.quotes.length, 2);

    const watchlistResponse = await app.inject({
      method: "GET",
      url: "/api/v1/market/watchlist?limit=100",
    });
    assert.equal(watchlistResponse.statusCode, 200);
    const watchlistBody = watchlistResponse.json();
    assert.ok(["mock", "real"].includes(watchlistBody.provider));
    assert.equal(watchlistBody.items.length, 100);

    const klineResponse = await app.inject({
      method: "GET",
      url: "/api/v1/klines?symbol=BTCUSDT&timeframe=15m&limit=2",
    });
    assert.equal(klineResponse.statusCode, 200);
    const klineBody = klineResponse.json();
    assert.equal(klineBody.symbol, "BTCUSDT");
    assert.equal(klineBody.klines.length, 2);

    const runScanResponse = await app.inject({
      method: "POST",
      url: "/api/v1/scan/run",
      payload: {
        symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
        timeframe: "15m",
      },
    });
    assert.equal(runScanResponse.statusCode, 200);
    const scanBody = runScanResponse.json();
    assert.equal(scanBody.scanRun.status, "completed");
    assert.ok(scanBody.results.length >= 1);

    const latestScanResponse = await app.inject({
      method: "GET",
      url: "/api/v1/scan/results?limit=5",
    });
    assert.equal(latestScanResponse.statusCode, 200);
    const latestScanBody = latestScanResponse.json();
    assert.ok(latestScanBody.results.length >= 1);
  } finally {
    await shutdown();
  }
};

const testAccountEndpointsConsistency = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    await app.inject({
      method: "GET",
      url: "/api/v1/quotes?symbols=BTCUSDT,ETHUSDT",
    });

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/account/summary",
    });
    assert.equal(summaryResponse.statusCode, 200);
    const summary = summaryResponse.json();

    const positionsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/account/positions",
    });
    assert.equal(positionsResponse.statusCode, 200);
    const positionsBody = positionsResponse.json();
    const netExposure = positionsBody.positions.reduce(
      (sum: number, position: { marketValue: number }) => sum + position.marketValue,
      0,
    );
    const recomputedEquity = summary.cashBalance + netExposure;
    assert.ok(Math.abs(recomputedEquity - summary.equity) < 0.02);

    const equityResponse = await app.inject({
      method: "GET",
      url: "/api/v1/account/equity?limit=10",
    });
    assert.equal(equityResponse.statusCode, 200);
    const equityBody = equityResponse.json();
    assert.ok(equityBody.points.length >= 1);
  } finally {
    await shutdown();
  }
};

const testOrderFillLifecycle = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const createOrderResponse = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "BTCUSDT",
        side: "buy",
        type: "market",
        quantity: 0.01,
      },
    });
    assert.equal(createOrderResponse.statusCode, 201);
    const created = createOrderResponse.json();
    assert.equal(created.order.status, "filled");
    assert.ok(created.fill);
    assert.equal(created.fill.orderId, created.order.id);

    const listOrdersResponse = await app.inject({
      method: "GET",
      url: "/api/v1/orders?limit=20",
    });
    assert.equal(listOrdersResponse.statusCode, 200);
    const ordersBody = listOrdersResponse.json();
    assert.ok(ordersBody.orders.some((item: { id: string }) => item.id === created.order.id));

    const fillsResponse = await app.inject({
      method: "GET",
      url: `/api/v1/fills?orderId=${created.order.id}`,
    });
    assert.equal(fillsResponse.statusCode, 200);
    const fillsBody = fillsResponse.json();
    assert.equal(fillsBody.fills.length, 1);
  } finally {
    await shutdown();
  }
};

const testCancelOpenOrder = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const createLimitResponse = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "ETHUSDT",
        side: "sell",
        type: "limit",
        quantity: 0.1,
        limitPrice: 3600,
      },
    });
    assert.equal(createLimitResponse.statusCode, 201);
    const order = createLimitResponse.json().order;
    assert.equal(order.status, "open");

    const cancelResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/orders/${order.id}`,
    });
    assert.equal(cancelResponse.statusCode, 200);
    assert.equal(cancelResponse.json().order.status, "cancelled");
  } finally {
    await shutdown();
  }
};

const testRiskRulesAndEvents = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const currentRulesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/risk/rules",
    });
    assert.equal(currentRulesResponse.statusCode, 200);

    const patchRulesResponse = await app.inject({
      method: "PATCH",
      url: "/api/v1/risk/rules",
      payload: {
        maxOrderNotional: 10,
      },
    });
    assert.equal(patchRulesResponse.statusCode, 200);
    assert.equal(patchRulesResponse.json().maxOrderNotional, 10);

    const blockedOrder = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "BTCUSDT",
        side: "buy",
        type: "market",
        quantity: 0.01,
      },
    });
    assert.equal(blockedOrder.statusCode, 409);
    const blockedBody = blockedOrder.json();
    assert.equal(blockedBody.category, "risk");
    assert.ok(String(blockedBody.code).startsWith("risk."));

    const riskEventsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/risk/events?limit=5",
    });
    assert.equal(riskEventsResponse.statusCode, 200);
    const events = riskEventsResponse.json().events;
    assert.ok(events.length >= 1);
  } finally {
    await shutdown();
  }
};

const testRunsLifecycle = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const strategiesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/strategies",
    });
    assert.equal(strategiesResponse.statusCode, 200);
    const strategyId = strategiesResponse.json()[0].id;

    const startResponse = await app.inject({
      method: "POST",
      url: "/api/v1/runs/start",
      payload: {
        strategyId,
        initialCash: 50000,
      },
    });
    assert.equal(startResponse.statusCode, 201);
    const run = startResponse.json();
    assert.equal(run.status, "running");

    const conflictStart = await app.inject({
      method: "POST",
      url: "/api/v1/runs/start",
      payload: {
        strategyId,
        initialCash: 30000,
      },
    });
    assert.equal(conflictStart.statusCode, 409);

    const stopResponse = await app.inject({
      method: "POST",
      url: `/api/v1/runs/${run.id}/stop`,
      payload: {
        stopReason: "test_stop",
      },
    });
    assert.equal(stopResponse.statusCode, 200);
    assert.equal(stopResponse.json().status, "stopped");
  } finally {
    await shutdown();
  }
};

const testOrderRiskAccountConsistency = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const initialPositions = await app.inject({
      method: "GET",
      url: "/api/v1/account/positions",
    });
    assert.equal(initialPositions.statusCode, 200);
    const initialBtcPosition = initialPositions
      .json()
      .positions.find((position: { symbol: string }) => position.symbol === "BTCUSDT");
    const initialBtcQty = initialBtcPosition?.quantity ?? 0;

    const summaryBefore = await app.inject({
      method: "GET",
      url: "/api/v1/account/summary",
    });
    assert.equal(summaryBefore.statusCode, 200);
    const beforeBody = summaryBefore.json();

    const buyResponse = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "BTCUSDT",
        side: "buy",
        type: "market",
        quantity: 0.01,
      },
    });
    assert.equal(buyResponse.statusCode, 201);

    const positionsAfterBuy = await app.inject({
      method: "GET",
      url: "/api/v1/account/positions",
    });
    const buyPositions = positionsAfterBuy.json().positions;
    const btcPosition = buyPositions.find((position: { symbol: string }) => position.symbol === "BTCUSDT");
    assert.ok(btcPosition);
    assert.ok(btcPosition.quantity > initialBtcQty);

    const sellResponse = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "BTCUSDT",
        side: "sell",
        type: "market",
        quantity: 0.01,
      },
    });
    assert.equal(sellResponse.statusCode, 201);

    const summaryAfterRoundTrip = await app.inject({
      method: "GET",
      url: "/api/v1/account/summary",
    });
    assert.equal(summaryAfterRoundTrip.statusCode, 200);
    const afterBody = summaryAfterRoundTrip.json();
    assert.ok(afterBody.cashBalance < beforeBody.cashBalance);

    const positionsAfterSell = await app.inject({
      method: "GET",
      url: "/api/v1/account/positions",
    });
    const sellPositions = positionsAfterSell.json().positions;
    const roundTripPosition = sellPositions.find((position: { symbol: string }) => position.symbol === "BTCUSDT");
    assert.ok(Math.abs((roundTripPosition?.quantity ?? 0) - initialBtcQty) < 0.000001);

    const equityRecomputed = afterBody.cashBalance + afterBody.netExposure;
    assert.ok(Math.abs(equityRecomputed - afterBody.equity) < 0.03);

    const tightenRisk = await app.inject({
      method: "PATCH",
      url: "/api/v1/risk/rules",
      payload: {
        maxOrderNotional: 10,
      },
    });
    assert.equal(tightenRisk.statusCode, 200);

    const blocked = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "BTCUSDT",
        side: "buy",
        type: "market",
        quantity: 0.01,
      },
    });
    assert.equal(blocked.statusCode, 409);

    const blockedOrderList = await app.inject({
      method: "GET",
      url: "/api/v1/orders?status=rejected&limit=10",
    });
    assert.equal(blockedOrderList.statusCode, 200);
    assert.equal(blockedOrderList.json().orders.length, 0);
  } finally {
    await shutdown();
  }
};

const testHistoryEndpoints = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const strategiesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/strategies",
    });
    const strategyId = strategiesResponse.json()[0].id;

    const startResponse = await app.inject({
      method: "POST",
      url: "/api/v1/runs/start",
      payload: {
        strategyId,
        initialCash: 60000,
      },
    });
    assert.equal(startResponse.statusCode, 201);
    const run = startResponse.json();

    const orderResponse = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        symbol: "BTCUSDT",
        side: "buy",
        type: "market",
        quantity: 0.02,
      },
    });
    assert.equal(orderResponse.statusCode, 201);

    await app.inject({
      method: "POST",
      url: `/api/v1/runs/${run.id}/stop`,
      payload: {
        stopReason: "history_test",
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/history/runs?limit=10",
    });
    assert.equal(listResponse.statusCode, 200);
    const listBody = listResponse.json();
    assert.ok(listBody.runs.some((item: { runId: string }) => item.runId === run.id));

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/history/runs/${run.id}?fillsLimit=20&eventsLimit=20&snapshotsLimit=200&snapshotSampleEvery=2`,
    });
    assert.equal(detailResponse.statusCode, 200);
    const detailBody = detailResponse.json();
    assert.equal(detailBody.run.id, run.id);
    assert.ok(Array.isArray(detailBody.snapshots));
  } finally {
    await shutdown();
  }
};

const testBacktestEndpoint = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const strategiesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/strategies",
    });
    const strategyId = strategiesResponse.json()[0].id;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/backtest/run",
      payload: {
        strategyId,
        symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
        timeframe: "1d",
        lookbackBars: 240,
        initialCapital: 10000,
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.ok(typeof body.backtestRunId === "string");
    assert.equal(body.timeframe, "1d");
    assert.ok(Array.isArray(body.results));
    assert.ok(body.results.length >= 1);
    assert.ok(Array.isArray(body.portfolio.equityCurve));
    assert.ok(Array.isArray(body.results[0].tradeReturnCurve));
    assert.ok(Array.isArray(body.results[0].priceCurve));
    assert.ok(Array.isArray(body.results[0].tradeMarkers));
    assert.ok(body.symbols.length <= 100);
  } finally {
    await shutdown();
  }
};

const testBacktestHistoryEndpoints = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const runResponse = await app.inject({
      method: "POST",
      url: "/api/v1/backtest/run",
      payload: {
        symbols: ["BTCUSDT", "ETHUSDT"],
        timeframe: "1d",
        lookbackBars: 120,
        initialCapital: 10000,
      },
    });
    assert.equal(runResponse.statusCode, 200);
    const runBody = runResponse.json();
    assert.ok(typeof runBody.backtestRunId === "string");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/backtest/history?limit=20",
    });
    assert.equal(listResponse.statusCode, 200);
    const listBody = listResponse.json();
    assert.ok(Array.isArray(listBody.items));
    assert.ok(listBody.items.some((row: { id: string }) => row.id === runBody.backtestRunId));

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/backtest/history/${runBody.backtestRunId}`,
    });
    assert.equal(detailResponse.statusCode, 200);
    const detailBody = detailResponse.json();
    assert.equal(detailBody.id, runBody.backtestRunId);
    assert.equal(detailBody.backtestRunId, runBody.backtestRunId);
    assert.ok(Array.isArray(detailBody.results));
    assert.ok(Array.isArray(detailBody.portfolio.equityCurve));
  } finally {
    await shutdown();
  }
};

const miniMaxFusionFixture = {
  strategyNameSuggestion: "EMA + RSI Lab Fusion",
  introduction: "Balanced mix for automated testing.",
  detailedEvaluation:
    "### 组合概览\n测试用融合。\n\n### 指标协同\nEMA 与 RSI 互补。\n\n### 风险与局限\n单测占位。\n\n### 适用行情\n通用。\n\n### 权重逻辑\n均衡分配。",
  radar: {
    returnPotential: 70,
    robustness: 68,
    riskControl: 72,
    explainability: 65,
    marketFit: 66,
  },
  indicators: [
    { id: "ema", name: "EMA", weight: 55, reason: "Core trend filter for the suite." },
    { id: "rsi", name: "RSI", weight: 45, reason: "Timing layer for entries." },
  ],
};

const testAiConfigAndFusionEndpoints = async (): Promise<void> => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/v1/chat/completions") && url.includes("minimax")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(miniMaxFusionFixture) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(input as RequestInfo, init);
  };

  const { app, shutdown } = await createApp();
  try {
    const getInitial = await app.inject({
      method: "GET",
      url: "/api/v1/ai/config",
    });
    assert.equal(getInitial.statusCode, 200);
    assert.equal(getInitial.json().provider, "minimax");

    const putConfig = await app.inject({
      method: "PUT",
      url: "/api/v1/ai/config",
      payload: {
        provider: "minimax",
        model: "MiniMax-M1",
        apiKey: "demo-secret-key",
      },
    });
    assert.equal(putConfig.statusCode, 200);
    const configBody = putConfig.json();
    assert.equal(configBody.hasApiKey, true);
    assert.ok(typeof configBody.apiKeyMasked === "string");

    const selectedFusion = await app.inject({
      method: "POST",
      url: "/api/v1/ai/fusion/generate",
      payload: {
        mode: "selected",
        selectedIndicators: [
          { id: "ema", name: "EMA", family: "trend", weight: 60 },
          { id: "rsi", name: "RSI", family: "momentum", weight: 40 },
        ],
      },
    });
    assert.equal(selectedFusion.statusCode, 200);
    const selectedBody = selectedFusion.json();
    assert.equal(selectedBody.mode, "selected");
    assert.equal(selectedBody.provider, "minimax");
    assert.ok(Array.isArray(selectedBody.indicators));
    assert.ok(selectedBody.indicators.length >= 2);
    assert.ok(typeof selectedBody.analysis === "string");
    assert.ok(selectedBody.analysis.length > 0);

    const promptFusion = await app.inject({
      method: "POST",
      url: "/api/v1/ai/fusion/generate",
      payload: {
        mode: "prompt",
        prompt: "做一个更稳健的趋势突破策略，控制回撤",
      },
    });
    assert.equal(promptFusion.statusCode, 200);
    const promptBody = promptFusion.json();
    assert.equal(promptBody.mode, "prompt");
    assert.ok(typeof promptBody.totalScore === "number");
    assert.ok(promptBody.radar.riskControl >= 0);
    assert.ok(typeof promptBody.analysis === "string");
  } finally {
    globalThis.fetch = originalFetch;
    await shutdown();
  }
};

const testBacktestSupportsLargeUniverse = async (): Promise<void> => {
  const { app, shutdown } = await createApp();
  try {
    const watchlistResponse = await app.inject({
      method: "GET",
      url: "/api/v1/market/watchlist?limit=100",
    });
    assert.equal(watchlistResponse.statusCode, 200);
    const watchlist = watchlistResponse.json().items.map((item: { symbol: string }) => item.symbol);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/backtest/run",
      payload: {
        symbols: watchlist,
        timeframe: "1d",
        lookbackBars: 120,
        initialCapital: 10000,
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.symbols.length, 100);
  } finally {
    await shutdown();
  }
};

const run = async (): Promise<void> => {
  const tests: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "validation returns clear 400 response", fn: testValidationErrorShape },
    { name: "strategy CRUD path works", fn: testStrategyCrudFlow },
    { name: "strategy delete path works", fn: testStrategyDeleteFlow },
    { name: "transaction helper rolls back on failure", fn: testTransactionRollback },
    { name: "market data and scanner endpoints work", fn: testMarketAndScannerFlow },
    { name: "account summary/equity/positions stay consistent", fn: testAccountEndpointsConsistency },
    { name: "orders API creates fills for market orders", fn: testOrderFillLifecycle },
    { name: "orders API cancels open limit orders", fn: testCancelOpenOrder },
    { name: "risk rules endpoint and risk events work", fn: testRiskRulesAndEvents },
    { name: "runs lifecycle enforces single active run", fn: testRunsLifecycle },
    { name: "orders/risk/account transitions stay internally consistent", fn: testOrderRiskAccountConsistency },
    { name: "history summary/detail endpoints work", fn: testHistoryEndpoints },
    { name: "backtest endpoint returns symbol and portfolio analytics", fn: testBacktestEndpoint },
    { name: "backtest history summary/detail endpoints replay persisted runs", fn: testBacktestHistoryEndpoints },
    { name: "backtest endpoint supports top100 universe", fn: testBacktestSupportsLargeUniverse },
    { name: "ai config and fusion endpoints work", fn: testAiConfigAndFusionEndpoints },
  ];

  for (const testCase of tests) {
    await testCase.fn();
    // Keep output concise for CI and local shell use.
    // eslint-disable-next-line no-console
    console.log(`PASS ${testCase.name}`);
  }
};

void run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("FAIL backend tests", error);
  process.exitCode = 1;
});
