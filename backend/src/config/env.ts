import dotenv from "dotenv";

dotenv.config();

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

/**
 * OpenAI 兼容文本接口的 Base URL（不含路径）。
 * - 国内/主站控制台密钥：默认 https://api.minimaxi.com/v1（见 platform.minimaxi.com 文档）
 * - 国际站：设为 https://api.minimax.io/v1
 */
const minimaxOpenAiBaseUrl = trimTrailingSlash(
  (process.env.MINIMAX_OPENAI_BASE_URL ?? "https://api.minimaxi.com/v1").trim(),
);

const parsePort = (input: string | undefined, fallback: number): number => {
  if (!input) return fallback;
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  host: process.env.HOST ?? "0.0.0.0",
  port: parsePort(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  wsPath: process.env.WS_PATH ?? "/ws",
  wsHeartbeatIntervalMs: parsePort(process.env.WS_HEARTBEAT_INTERVAL_MS, 15000),
  marketDataProvider: (process.env.MARKET_DATA_PROVIDER ?? "real").trim().toLowerCase() === "real" ? "real" : "mock",
  minimaxOpenAiBaseUrl,
} as const;
