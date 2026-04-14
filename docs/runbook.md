# V1 Runbook

## Local Setup

1. Install dependencies:
`npm run install:all`
2. Start frontend + backend:
`npm run dev`
3. Backend health check:
`http://localhost:3001/health`
4. Frontend default URL:
`http://localhost:5173`
5. Real market data (default):
`MARKET_DATA_PROVIDER=real` (configured in `backend/.env.example` and used as backend default when env is absent)

## Validation Commands

1. Frontend lint:
`npm run lint --workspace frontend`
2. Full tests:
`npm test`
3. Full build:
`npm run build`
4. Smoke checks (requires backend running):
`npm run smoke:v1`

## Operational Checks

1. API status:
`GET /api/v1/system/status`
2. WebSocket:
Connect `ws://localhost:3001/ws`, verify first event is `snapshot`.
3. Trading loop:
Create order -> verify `order.updated`/`fill.created` -> inspect `/api/v1/history/runs`.

## Troubleshooting

1. `validation.request_invalid`:
Check payload schema and required fields.
2. `risk.*`:
Inspect `/api/v1/risk/rules` and `/api/v1/risk/events`.
3. `conflict.active_run_exists`:
Stop current run via `POST /api/v1/runs/:id/stop`.
4. Frontend stale after reconnect:
Check websocket logs and confirm `snapshot` received before incremental events.
5. Build chunk warning:
Confirm route lazy imports remain in `frontend/src/app/routes.tsx`.
6. Dashboard/watchlist price appears synthetic:
Check backend env `MARKET_DATA_PROVIDER`; prefer `real`. If upstream API is temporarily unavailable, provider falls back to cached last real data and only then mock fallback.
