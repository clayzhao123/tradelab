# V1 Acceptance Checklist

## Core Product Integrity

- [x] No shipped page relies on hardcoded mock fallback for primary data.
- [x] Dashboard/Orders react to realtime websocket updates.
- [x] Order/fill/position/account transitions stay internally consistent.
- [x] End-to-end user loop is possible: inspect -> place order -> run/stop -> review history.

## Stability and Consistency

- [x] Backend tests cover market + limit order flows, cancel constraints, risk rejections, run lifecycle, and history APIs.
- [x] Frontend tests cover websocket reconnect behavior and API critical-loop integration.
- [x] Websocket stream requires `snapshot` baseline after reconnect before consuming incremental events.
- [x] Event ordering guard is enforced in frontend via `seq` (fallback to `ts` ordering if `seq` absent).

## Observability and Error Contracts

- [x] API errors use unified fields: `code`, `category`, `requestId`, `message`.
- [x] Backend request logs include `requestId` and entity IDs (`runId`, `orderId`, `strategyId`) when available.
- [x] Frontend uses typed `ApiError` mapping for consistent user-facing error messaging.

## Performance and Build

- [x] Route-level lazy loading is enabled for all major pages.
- [x] Workspace `npm run build` passes.
- [x] Workspace `npm test` passes.

## Release Readiness

- [x] Smoke script validates core HTTP routes and websocket snapshot contract (`npm run smoke:v1`).
- [x] Runbook documents setup, validation, and troubleshooting flow.
