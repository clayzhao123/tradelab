const API_BASE_URL = process.env.V1_API_BASE_URL ?? "http://localhost:3001";
const WS_BASE_URL = process.env.V1_WS_BASE_URL ?? "ws://localhost:3001/ws";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getJson = async (path) => {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
};

const checkHttp = async () => {
  const health = await getJson("/health");
  assert(health.res.status === 200, "GET /health failed");
  assert(health.body?.status === "ok", "health status is not ok");

  const system = await getJson("/api/v1/system/status");
  assert(system.res.status === 200, "GET /api/v1/system/status failed");
  assert(Array.isArray(system.body?.modules), "system modules payload invalid");

  const orders = await getJson("/api/v1/orders?limit=5");
  assert(orders.res.status === 200, "GET /api/v1/orders failed");
  assert(Array.isArray(orders.body?.orders), "orders payload invalid");

  const history = await getJson("/api/v1/history/runs?limit=5");
  assert(history.res.status === 200, "GET /api/v1/history/runs failed");
  assert(Array.isArray(history.body?.runs), "history payload invalid");

  console.log("PASS http smoke");
};

const checkWs = async () => {
  if (typeof WebSocket !== "function") {
    console.log("SKIP ws smoke (WebSocket unavailable in runtime)");
    return;
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket snapshot timeout"));
    }, 8000);

    const ws = new WebSocket(WS_BASE_URL);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "snapshot") {
          assert(typeof payload.seq === "number", "snapshot seq missing");
          assert(typeof payload.ts === "string", "snapshot ts missing");
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      } catch (error) {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket error"));
    };
  });

  console.log("PASS ws smoke");
};

const run = async () => {
  await checkHttp();
  await checkWs();
  console.log("PASS v1 smoke suite");
};

run().catch((error) => {
  console.error("FAIL v1 smoke suite", error);
  process.exitCode = 1;
});
