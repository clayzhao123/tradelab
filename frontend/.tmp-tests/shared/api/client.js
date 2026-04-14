const env = (typeof import.meta !== "undefined" ? import.meta.env ?? {} : {});
/** 开发环境默认走相对路径，由 Vite proxy 转发到后端，避免直连端口失败。 */
const rawApiBase = env.VITE_API_BASE_URL;
const API_BASE_URL = rawApiBase !== undefined && String(rawApiBase).length > 0
    ? String(rawApiBase).replace(/\/$/, "")
    : env.DEV
        ? ""
        : "http://localhost:3001";
const toUrl = (path) => `${API_BASE_URL}${path}`;
const describeApiTarget = () => API_BASE_URL ? API_BASE_URL : typeof window !== "undefined" ? `${window.location.origin}（经开发代理）` : "当前站点";
export class ApiError extends Error {
    status;
    code;
    category;
    requestId;
    details;
    constructor(input) {
        super(input.message);
        this.name = "ApiError";
        this.status = input.status;
        this.code = input.code;
        this.category = input.category;
        this.requestId = input.requestId;
        this.details = input.details;
    }
}
export function toUserErrorMessage(error) {
    if (error instanceof ApiError) {
        if (error.category === "risk") {
            return `Order rejected by risk rule (${error.code}).`;
        }
        if (error.category === "validation") {
            if (error.code.startsWith("validation.ai_")) {
                return error.message;
            }
            return "Request validation failed. Please check your inputs.";
        }
        if (error.category === "not_found") {
            return "Requested resource was not found.";
        }
        return error.message;
    }
    if (error instanceof Error) {
        if (error.message === "Failed to fetch" || error.name === "TypeError") {
            return `无法连接后端 API（目标：${describeApiTarget()}）。请确认已在 tradelab/v1/backend 运行 npm run dev（默认端口 3001），或在本项目 frontend/.env 中设置正确的 VITE_API_BASE_URL。`;
        }
        return error.message;
    }
    return "Request failed";
}
async function requestJson(path, init) {
    let response;
    try {
        response = await fetch(toUrl(path), {
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers ?? {}),
            },
            ...init,
        });
    }
    catch (cause) {
        const hint = `无法连接后端 API（目标：${describeApiTarget()}）。请确认后端已启动（默认 http://127.0.0.1:3001），开发模式下也可依赖 Vite 代理（勿把 API 指到错误端口）。`;
        const err = new Error(`${hint} 原始错误：${cause instanceof Error ? cause.message : String(cause)}`);
        err.cause = cause;
        throw err;
    }
    if (!response.ok) {
        const rawBody = await response.text();
        let payload = null;
        try {
            payload = rawBody ? JSON.parse(rawBody) : null;
        }
        catch {
            payload = null;
        }
        if (payload && typeof payload === "object") {
            const maybe = payload;
            const category = maybe.category;
            const code = maybe.code;
            const message = maybe.message;
            if (typeof category === "string" &&
                typeof code === "string" &&
                typeof message === "string" &&
                ["validation", "risk", "conflict", "not_found", "internal"].includes(category)) {
                throw new ApiError({
                    status: response.status,
                    category: category,
                    code,
                    message,
                    requestId: typeof maybe.requestId === "string" ? maybe.requestId : undefined,
                    details: maybe.details,
                });
            }
        }
        const body = rawBody || response.statusText;
        throw new Error(`${response.status} ${body}`);
    }
    if (response.status === 204) {
        return null;
    }
    const rawBody = await response.text();
    if (!rawBody) {
        return null;
    }
    return JSON.parse(rawBody);
}
export const api = {
    getMarketWatchlist: async (limit = 100) => requestJson(`/api/v1/market/watchlist?limit=${limit}`),
    getQuotes: async (symbols) => {
        const query = symbols && symbols.length > 0 ? `?symbols=${symbols.join(",")}` : "";
        const data = await requestJson(`/api/v1/quotes${query}`);
        return data.quotes;
    },
    getKlines: async (symbol, timeframe = "15m", limit = 80) => {
        const data = await requestJson(`/api/v1/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`);
        return data.klines;
    },
    getScanResults: async (limit = 30) => {
        const data = await requestJson(`/api/v1/scan/results?limit=${limit}`);
        return data.results;
    },
    runScan: async (symbols, timeframe = "15m") => requestJson("/api/v1/scan/run", {
        method: "POST",
        body: JSON.stringify({ symbols, timeframe }),
    }),
    getAccountSummary: async () => requestJson("/api/v1/account/summary"),
    getAccountEquity: async (limit = 100) => {
        const data = await requestJson(`/api/v1/account/equity?limit=${limit}`);
        return data.points;
    },
    getPositions: async () => {
        const data = await requestJson("/api/v1/account/positions");
        return data.positions;
    },
    getOrders: async (input) => {
        const params = new URLSearchParams();
        params.set("limit", String(input?.limit ?? 100));
        if (input?.status) {
            params.set("status", input.status);
        }
        if (input?.symbol) {
            params.set("symbol", input.symbol.toUpperCase());
        }
        const data = await requestJson(`/api/v1/orders?${params.toString()}`);
        return data.orders;
    },
    createOrder: async (input) => requestJson("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify(input),
    }),
    cancelOrder: async (orderId) => {
        const data = await requestJson(`/api/v1/orders/${orderId}`, { method: "DELETE" });
        return data.order;
    },
    getFills: async (input) => {
        const params = new URLSearchParams();
        params.set("limit", String(input?.limit ?? 100));
        if (input?.symbol) {
            params.set("symbol", input.symbol.toUpperCase());
        }
        if (input?.orderId) {
            params.set("orderId", input.orderId);
        }
        const data = await requestJson(`/api/v1/fills?${params.toString()}`);
        return data.fills;
    },
    getStrategies: async () => requestJson("/api/v1/strategies"),
    createStrategy: async (input) => requestJson("/api/v1/strategies", {
        method: "POST",
        body: JSON.stringify(input),
    }),
    updateStrategy: async (id, patch) => requestJson(`/api/v1/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }),
    deleteStrategy: async (id) => {
        await requestJson(`/api/v1/strategies/${id}`, {
            method: "DELETE",
        });
    },
    getRuns: async () => requestJson("/api/v1/runs"),
    startRun: async (input) => requestJson("/api/v1/runs/start", { method: "POST", body: JSON.stringify(input) }),
    stopRun: async (runId, stopReason) => requestJson(`/api/v1/runs/${runId}/stop`, {
        method: "POST",
        body: JSON.stringify({ stopReason }),
    }),
    getHistoryRuns: async (limit = 100) => {
        const data = await requestJson(`/api/v1/history/runs?limit=${limit}`);
        return data.runs;
    },
    getHistoryRunDetail: async (runId) => requestJson(`/api/v1/history/runs/${runId}?fillsLimit=500&eventsLimit=500&snapshotsLimit=1000&snapshotSampleEvery=2`),
    getRiskRules: async () => requestJson("/api/v1/risk/rules"),
    updateRiskRules: async (patch) => requestJson("/api/v1/risk/rules", {
        method: "PATCH",
        body: JSON.stringify(patch),
    }),
    getRiskEvents: async (input) => {
        const params = new URLSearchParams();
        params.set("limit", String(input?.limit ?? 100));
        if (input?.severity) {
            params.set("severity", input.severity);
        }
        if (input?.runId) {
            params.set("runId", input.runId);
        }
        const data = await requestJson(`/api/v1/risk/events?${params.toString()}`);
        return data.events;
    },
    runBacktest: async (input) => requestJson("/api/v1/backtest/run", {
        method: "POST",
        body: JSON.stringify(input),
    }),
    getBacktestHistory: async (limit = 50) => {
        const data = await requestJson(`/api/v1/backtest/history?limit=${limit}`);
        return data.items;
    },
    getBacktestHistoryDetail: async (id) => requestJson(`/api/v1/backtest/history/${id}`),
    deleteBacktestHistory: async (id) => {
        await requestJson(`/api/v1/backtest/history/${id}`, { method: "DELETE" });
    },
    getAiConfig: async () => requestJson("/api/v1/ai/config"),
    updateAiConfig: async (input) => requestJson("/api/v1/ai/config", {
        method: "PUT",
        body: JSON.stringify(input),
    }),
    generateAiFusion: async (input) => requestJson("/api/v1/ai/fusion/generate", {
        method: "POST",
        body: JSON.stringify(input),
    }),
};
