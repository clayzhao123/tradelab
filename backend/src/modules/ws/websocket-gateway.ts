import { createHash, randomUUID } from "node:crypto";
import type { Socket } from "node:net";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance } from "fastify";
import type { AccountService } from "../account/account.service.js";
import type { MarketService } from "../market/market.service.js";
import type { RunsService } from "../runs/runs.service.js";
import type { ScannerService } from "../scanner/scanner.service.js";
import type { EventHub, RealtimeEvent } from "./event-hub.js";

type WebSocketClient = {
  id: string;
  socket: Socket;
};

type RegisterWebSocketGatewayOptions = {
  app: FastifyInstance;
  path: string;
  heartbeatIntervalMs: number;
  accountService: AccountService;
  marketService: MarketService;
  scannerService: ScannerService;
  runsService: RunsService;
  eventHub: EventHub;
};

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const toWebSocketAccept = (key: string): string =>
  createHash("sha1").update(`${key}${GUID}`).digest("base64");

const encodeTextFrame = (payload: string): Buffer => {
  const payloadBuffer = Buffer.from(payload);
  const payloadLength = payloadBuffer.length;

  if (payloadLength < 126) {
    return Buffer.concat([Buffer.from([0x81, payloadLength]), payloadBuffer]);
  }

  if (payloadLength < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
    return Buffer.concat([header, payloadBuffer]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);
  return Buffer.concat([header, payloadBuffer]);
};

const sendJson = (socket: Socket, payload: Record<string, unknown>): void => {
  const encoded = encodeTextFrame(JSON.stringify(payload));
  socket.write(encoded);
};

const parseClientFrame = (buffer: Buffer): { opcode: number } | null => {
  if (buffer.length < 2) {
    return null;
  }

  const opcode = buffer[0] & 0x0f;
  return { opcode };
};

const closeSocket = (socket: Socket): void => {
  if (!socket.destroyed) {
    socket.end();
  }
};

export const registerWebSocketGateway = ({
  app,
  path,
  heartbeatIntervalMs,
  accountService,
  marketService,
  scannerService,
  runsService,
  eventHub,
}: RegisterWebSocketGatewayOptions): (() => void) => {
  const dashboardSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const dashboardScanLimit = 20;

  const clients = new Map<string, WebSocketClient>();
  const broadcastEvent = (event: RealtimeEvent): void => {
    for (const client of clients.values()) {
      sendJson(client.socket, event);
    }
  };

  const unsubscribe = eventHub.subscribe((event) => {
    broadcastEvent(event);
  });

  const publishDashboardUpdate = async (): Promise<void> => {
    const [accountSummary, activeRun, quotes, scanResults] = await Promise.all([
      accountService.getSummary(),
      runsService.getActiveRun(),
      marketService.getQuotes(dashboardSymbols),
      scannerService.getLatestResults(dashboardScanLimit),
    ]);

    broadcastEvent({
      seq: eventHub.nextSequence(),
      type: "dashboard.updated",
      ts: new Date().toISOString(),
      data: {
        accountSummary,
        activeRun,
        quotes,
        scanResults,
      },
    });
  };

  const heartbeatTimer = setInterval(() => {
    void (async () => {
      const activeRun = await runsService.getActiveRun();
      broadcastEvent({
        seq: eventHub.nextSequence(),
        type: "heartbeat",
        ts: new Date().toISOString(),
        data: {
          activeRunId: activeRun?.id ?? null,
        },
      });

      try {
        await publishDashboardUpdate();
      } catch (error) {
        app.log.warn({ err: error }, "failed to publish dashboard update");
      }
    })();
  }, heartbeatIntervalMs);

  const onUpgrade = async (request: IncomingMessage, socket: Socket): Promise<void> => {
    const requestPath = request.url?.split("?")[0] ?? "";
    if (requestPath !== path) {
      return;
    }

    const webSocketKey = request.headers["sec-websocket-key"];
    if (typeof webSocketKey !== "string") {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      closeSocket(socket);
      return;
    }

    const acceptKey = toWebSocketAccept(webSocketKey);
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKey}`,
        "\r\n",
      ].join("\r\n"),
    );

    const clientId = randomUUID();
    clients.set(clientId, { id: clientId, socket });
    app.log.info({ clientId }, "websocket client connected");

    const [accountSummary, activeRun, quotes, scanResults] = await Promise.all([
      accountService.getSummary(),
      runsService.getActiveRun(),
      marketService.getQuotes(dashboardSymbols),
      scannerService.getLatestResults(dashboardScanLimit),
    ]);

    sendJson(socket, {
      seq: eventHub.nextSequence(),
      type: "snapshot",
      ts: new Date().toISOString(),
      data: {
        accountSummary,
        activeRun,
        quotes,
        scanResults,
      },
    });

    socket.on("data", (frameBuffer: Buffer) => {
      const frame = parseClientFrame(frameBuffer);
      if (!frame) {
        return;
      }
      if (frame.opcode === 0x8) {
        closeSocket(socket);
      }
    });

    socket.on("error", (error) => {
      app.log.warn({ clientId, err: error }, "websocket client error");
      clients.delete(clientId);
    });

    socket.on("close", () => {
      clients.delete(clientId);
      app.log.info({ clientId }, "websocket client disconnected");
    });
  };

  app.server.on("upgrade", onUpgrade);

  return () => {
    unsubscribe();
    clearInterval(heartbeatTimer);
    app.server.off("upgrade", onUpgrade);
    for (const client of clients.values()) {
      closeSocket(client.socket);
    }
    clients.clear();
  };
};
