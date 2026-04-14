# WebSocket Event Contract (V1)

## Endpoint

- URL: `/ws`
- Default local URL: `ws://localhost:3001/ws`

## Envelope

All events use the same envelope:

```json
{
  "seq": 123,
  "type": "snapshot",
  "ts": "2026-04-04T02:30:00.000Z",
  "data": {}
}
```

Fields:

- `seq`: Monotonic sequence number for ordering.
- `type`: Event name.
- `ts`: Event timestamp (ISO-8601).
- `data`: Event payload.

## Event Types

- `snapshot`
- `dashboard.updated`
- `heartbeat`
- `order.updated`
- `fill.created`
- `run.updated`
- `account.updated`
- `risk.triggered`

## Reconnect Semantics

1. On each (re)connection, server sends `snapshot` first.
2. Client must treat `snapshot` as baseline state.
3. Client must ignore incremental events until a new `snapshot` is accepted.
4. Client must drop out-of-order events:
   - Prefer `seq` ordering.
   - Fallback to `ts` ordering when `seq` unavailable.
