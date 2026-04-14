import assert from "node:assert/strict";
import { ApiError, api } from "../shared/api/client.js";
import { createWsClient, type WsEvent } from "../shared/realtime/wsClient.js";

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type MockSocket = {
  url: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
  emitOpen: () => void;
  emitClose: () => void;
  emitMessage: (payload: Record<string, unknown>) => void;
};

const createSocketMockFactory = () => {
  const sockets: MockSocket[] = [];

  class MockWebSocketImpl {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;
    url: string;
    readyState = 0;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      sockets.push(this as unknown as MockSocket);
    }

    close(): void {
      this.readyState = MockWebSocketImpl.CLOSED;
      this.onclose?.();
    }

    emitOpen(): void {
      this.readyState = MockWebSocketImpl.OPEN;
      this.onopen?.();
    }

    emitClose(): void {
      this.readyState = MockWebSocketImpl.CLOSED;
      this.onclose?.();
    }

    emitMessage(payload: Record<string, unknown>): void {
      this.onmessage?.({ data: JSON.stringify(payload) });
    }
  }

  return {
    sockets,
    MockWebSocketImpl,
  };
};

const testWsReconnectHydration = async (): Promise<void> => {
  const wsGlobal = globalThis as typeof globalThis & { WebSocket: typeof WebSocket };
  const originalWebSocket = globalThis.WebSocket;
  const { sockets, MockWebSocketImpl } = createSocketMockFactory();
  wsGlobal.WebSocket = MockWebSocketImpl as unknown as typeof WebSocket;

  const statuses: string[] = [];
  const events: WsEvent[] = [];

  try {
    const client = createWsClient(
      {
        onStatus: (status) => statuses.push(status),
        onEvent: (event) => events.push(event),
      },
      {
        reconnectMinMs: 5,
        reconnectMaxMs: 5,
        reconnectFactor: 1,
        reconnectJitterMs: 0,
      },
    );

    assert.equal(sockets.length, 1);
    sockets[0].emitOpen();
    sockets[0].emitMessage({
      seq: 1,
      type: "snapshot",
      ts: new Date().toISOString(),
      data: { accountSummary: { equity: 100000 }, activeRun: null },
    });
    sockets[0].emitClose();

    await wait(12);
    assert.equal(sockets.length, 2);
    sockets[1].emitOpen();
    sockets[1].emitMessage({
      seq: 2,
      type: "snapshot",
      ts: new Date().toISOString(),
      data: { accountSummary: { equity: 100200 }, activeRun: { id: "run-1", status: "running" } },
    });

    client.close();
    await wait(12);
    assert.equal(sockets.length, 2);
    assert.ok(statuses.includes("connecting"));
    assert.ok(statuses.includes("open"));
    assert.ok(events.filter((event) => event.type === "snapshot").length >= 2);
  } finally {
    wsGlobal.WebSocket = originalWebSocket;
  }
};

const testApiCriticalUserLoop = async (): Promise<void> => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ url, method });

    const parsed = new URL(url);
    const path = parsed.pathname;
    const json = (body: unknown): Response =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    if (path === "/api/v1/account/summary") {
      return json({
        cashBalance: 100000,
        equity: 100000,
        buyingPower: 100000,
        grossExposure: 0,
        netExposure: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        drawdownPct: 0,
        updatedAt: new Date().toISOString(),
      });
    }
    if (path === "/api/v1/orders" && method === "GET") {
      return json({ orders: [] });
    }
    if (path === "/api/v1/orders" && method === "POST") {
      return json({
        order: {
          id: "order-1",
          runId: null,
          strategyId: null,
          symbol: "BTCUSDT",
          side: "buy",
          type: "market",
          status: "filled",
          quantity: 0.01,
          limitPrice: null,
          filledQuantity: 0.01,
          avgFillPrice: 50000,
          requestedAt: new Date().toISOString(),
          openedAt: null,
          cancelledAt: null,
          rejectedReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        fill: null,
      });
    }
    if (path === "/api/v1/orders/order-1" && method === "DELETE") {
      return json({
        order: {
          id: "order-1",
          runId: null,
          strategyId: null,
          symbol: "BTCUSDT",
          side: "buy",
          type: "market",
          status: "cancelled",
          quantity: 0.01,
          limitPrice: null,
          filledQuantity: 0,
          avgFillPrice: null,
          requestedAt: new Date().toISOString(),
          openedAt: null,
          cancelledAt: new Date().toISOString(),
          rejectedReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }
    if (path === "/api/v1/fills" && method === "GET") {
      return json({ fills: [] });
    }
    if (path === "/api/v1/runs/start" && method === "POST") {
      return json({
        id: "run-1",
        strategyId: "strategy-1",
        status: "running",
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        stopReason: null,
        initialCash: 100000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    if (path === "/api/v1/runs/run-1/stop" && method === "POST") {
      return json({
        id: "run-1",
        strategyId: "strategy-1",
        status: "stopped",
        startedAt: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
        stopReason: "manual",
        initialCash: 100000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    if (path === "/api/v1/history/runs" && method === "GET") {
      return json({ runs: [] });
    }
    if (path === "/api/v1/history/runs/run-1" && method === "GET") {
      return json({
        run: {
          id: "run-1",
          strategyId: "strategy-1",
          status: "stopped",
          startedAt: new Date().toISOString(),
          stoppedAt: new Date().toISOString(),
          stopReason: "manual",
          initialCash: 100000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        summary: {
          runId: "run-1",
          strategyId: "strategy-1",
          status: "stopped",
          startedAt: new Date().toISOString(),
          stoppedAt: new Date().toISOString(),
          stopReason: "manual",
          initialCash: 100000,
          fillsCount: 0,
          riskEventsCount: 0,
          turnover: 0,
          fees: 0,
          latestEquity: 100000,
          latestDrawdownPct: 0,
          updatedAt: new Date().toISOString(),
        },
        fills: [],
        riskEvents: [],
        snapshots: [],
      });
    }
    return new Response("not_found", { status: 404 });
  }) as typeof fetch;

  try {
    await api.getAccountSummary();
    await api.getOrders({ limit: 20, status: "open", symbol: "btcusdt" });
    await api.getFills({ limit: 10, symbol: "btcusdt" });
    await api.createOrder({ symbol: "BTCUSDT", side: "buy", type: "market", quantity: 0.01 });
    await api.cancelOrder("order-1");
    await api.startRun({ strategyId: "strategy-1", initialCash: 100000 });
    await api.stopRun("run-1", "manual");
    await api.getHistoryRuns(20);
    await api.getHistoryRunDetail("run-1");

    const orderGetRequest = requests.find((req) => req.url.includes("/api/v1/orders?"));
    assert.ok(orderGetRequest);
    if (orderGetRequest) {
      assert.ok(orderGetRequest.url.includes("status=open"));
      assert.ok(orderGetRequest.url.includes("symbol=BTCUSDT"));
    }

    const methods = requests.map((req) => req.method);
    assert.ok(methods.includes("POST"));
    assert.ok(methods.includes("DELETE"));
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const testApiErrorNormalization = async (): Promise<void> => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: "Request Error",
        message: "Projected symbol exposure exceeds configured limit",
        category: "risk",
        code: "risk.max_symbol_exposure_pct",
        requestId: "req-1",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    )) as typeof fetch;

  try {
    let thrown: unknown;
    try {
      await api.createOrder({ symbol: "BTCUSDT", side: "buy", type: "market", quantity: 0.01 });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown instanceof ApiError);
    if (thrown instanceof ApiError) {
      assert.equal(thrown.category, "risk");
      assert.equal(thrown.code, "risk.max_symbol_exposure_pct");
      assert.equal(thrown.status, 409);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const run = async (): Promise<void> => {
  const tests: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "ws client reconnects and snapshot hydration stays reliable", fn: testWsReconnectHydration },
    { name: "api layer supports critical user loop endpoints", fn: testApiCriticalUserLoop },
    { name: "api errors are normalized into typed frontend errors", fn: testApiErrorNormalization },
  ];

  for (const testCase of tests) {
    await testCase.fn();
    console.log(`PASS ${testCase.name}`);
  }
};

void run().catch((error) => {
  console.error("FAIL frontend tests", error);
  process.exitCode = 1;
});
