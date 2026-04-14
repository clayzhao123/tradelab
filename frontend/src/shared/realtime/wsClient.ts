export type WsEvent = {
  seq: number;
  type: string;
  ts: string;
  data: Record<string, unknown>;
};

type WsHandlers = {
  onStatus?: (status: "connecting" | "open" | "closed" | "error") => void;
  onEvent?: (event: WsEvent) => void;
};

type WsClientOptions = {
  reconnectMinMs?: number;
  reconnectMaxMs?: number;
  reconnectFactor?: number;
  reconnectJitterMs?: number;
};

const env =
  (typeof import.meta !== "undefined" ? (import.meta as ImportMeta).env ?? {} : {}) as Record<
    string,
    string | boolean | undefined
  >;
const rawWsBase = env.VITE_WS_BASE_URL;
const WS_BASE_URL =
  rawWsBase !== undefined && String(rawWsBase).length > 0
    ? String(rawWsBase).replace(/\/$/, "")
    : env.DEV && typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
      : "ws://localhost:3001";
const WS_PATH = "/ws";

const DEFAULT_RECONNECT_MIN_MS = 800;
const DEFAULT_RECONNECT_MAX_MS = 12_000;
const DEFAULT_RECONNECT_FACTOR = 1.8;
const DEFAULT_RECONNECT_JITTER_MS = 400;

export function createWsClient(handlers: WsHandlers, options?: WsClientOptions): { close: () => void } {
  const reconnectMinMs = options?.reconnectMinMs ?? DEFAULT_RECONNECT_MIN_MS;
  const reconnectMaxMs = options?.reconnectMaxMs ?? DEFAULT_RECONNECT_MAX_MS;
  const reconnectFactor = options?.reconnectFactor ?? DEFAULT_RECONNECT_FACTOR;
  const reconnectJitterMs = options?.reconnectJitterMs ?? DEFAULT_RECONNECT_JITTER_MS;

  let socket: WebSocket | null = null;
  let isClosing = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnectTimer = (): void => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = (): void => {
    if (isClosing) {
      return;
    }
    clearReconnectTimer();
    const exponential = reconnectMinMs * reconnectFactor ** reconnectAttempt;
    const bounded = Math.min(reconnectMaxMs, exponential);
    const jitter = Math.floor(Math.random() * reconnectJitterMs);
    const delay = bounded + jitter;
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = (): void => {
    handlers.onStatus?.("connecting");
    socket = new WebSocket(`${WS_BASE_URL}${WS_PATH}`);

    socket.onopen = () => {
      reconnectAttempt = 0;
      handlers.onStatus?.("open");
    };
    socket.onclose = () => {
      handlers.onStatus?.("closed");
      scheduleReconnect();
    };
    socket.onerror = () => handlers.onStatus?.("error");
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WsEvent;
        handlers.onEvent?.(parsed);
      } catch {
        // ignore malformed payloads
      }
    };
  };

  connect();

  return {
    close: () => {
      isClosing = true;
      clearReconnectTimer();
      socket?.close();
      handlers.onStatus?.("closed");
    },
  };
}

