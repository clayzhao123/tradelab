import { after, test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { createApp } = await import("./create-app.js");

const appCtx = await createApp();
after(async () => {
  await appCtx.shutdown();
});

test("POST /api/v1/strategies rejects invalid payload with validation details", async () => {
  const response = await appCtx.app.inject({
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
});

test("strategy CRUD flow works through service-backed routes", async () => {
  const createResponse = await appCtx.app.inject({
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
  assert.equal(created.name, "RSI Mean Reversion");

  const patchResponse = await appCtx.app.inject({
    method: "PATCH",
    url: `/api/v1/strategies/${created.id}`,
    payload: {
      description: "Buy oversold conditions with tighter exits",
    },
  });
  assert.equal(patchResponse.statusCode, 200);

  const listResponse = await appCtx.app.inject({
    method: "GET",
    url: "/api/v1/strategies",
  });

  assert.equal(listResponse.statusCode, 200);
  const strategies = listResponse.json();
  assert.ok(strategies.some((item: { id: string }) => item.id === created.id));
});
