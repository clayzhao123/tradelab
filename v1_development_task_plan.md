# V1 Development Task Plan

## 1) Assessment Outcome

- Source reference is available at `../frontend_module` and currently behaves as a visual template with mock-driven pages.
- V1 target is a full-stack single-user paper trading product with real backend state, PostgreSQL persistence, and websocket-driven realtime updates.
- `v1` directory is currently empty, so all implementation artifacts can be isolated here as required.
- Recommended implementation split under `v1`:
  - `frontend/` (React + TypeScript + Vite + Tailwind v4)
  - `backend/` (Fastify + TypeScript + WebSocket)
  - `database/` (schema + migrations + seed)
  - `docs/` (API contracts, state model, runbook)

## 2) Delivery Strategy

- Build from contracts first: domain language -> schema -> API -> websocket events -> frontend integration.
- Preserve template interaction language, but remove all hardcoded mock behavior from shipped paths.
- Keep market data provider swappable (`mock` + `real`) behind a common backend interface.
- Deliver in thin vertical slices so each page gets real data early.

## 3) Detailed Task Table

| ID | Phase | Task | Output | Depends On | Acceptance |
|---|---|---|---|---|---|
| P0-01 | Project Setup | Create `v1/frontend`, `v1/backend`, `v1/database`, `v1/docs` structure | Clean workspace layout | None | All directories created and committed |
| P0-02 | Project Setup | Initialize frontend app (Vite React TS) in `v1/frontend` | Runnable frontend scaffold | P0-01 | `npm run dev` starts successfully |
| P0-03 | Project Setup | Initialize backend app (Fastify TS) in `v1/backend` | Runnable API scaffold | P0-01 | `npm run dev` serves health endpoint |
| P0-04 | Project Setup | Add workspace scripts (install/dev/build/test) from `v1` root | Unified developer commands | P0-02, P0-03 | Root scripts run both apps correctly |
| P0-05 | Project Setup | Add env templates for frontend/backend/db | `.env.example` files | P0-02, P0-03 | App boots with documented env vars |
| P1-01 | Product Freeze | Freeze V1 page semantics and navigation labels | `v1/docs/page-semantics.md` | P0-01 | All V1 pages mapped to one clear purpose |
| P1-02 | Product Freeze | Freeze visual tokens (surface, borders, state colors, density) | `v1/docs/design-tokens.md` | P1-01 | Token set covers all state feedback requirements |
| P1-03 | Product Freeze | Define domain glossary (run, order, fill, risk event, snapshot) | `v1/docs/domain-glossary.md` | P1-01 | Domain terms used consistently in API names |
| P2-01 | Data Model | Design PostgreSQL schema for V1 tables | `v1/database/schema.sql` | P1-03 | All tables in V1 scope represented |
| P2-02 | Data Model | Add migration files for schema versioning | `v1/database/migrations/*` | P2-01 | Fresh database migration passes |
| P2-03 | Data Model | Add seed data for local development | `v1/database/seeds/*` | P2-02 | Local dataset enables all core UI flows |
| P2-04 | Data Model | Define indexes + constraints for consistency | Updated migrations | P2-01 | Integrity checks prevent invalid state |
| P3-01 | Backend Foundation | Setup Fastify modules and route registration | Modular backend skeleton | P0-03, P1-03 | Modules match V1 architecture map |
| P3-02 | Backend Foundation | Add typed DTO schemas and validation | Shared request/response contracts | P3-01 | Invalid payloads rejected with clear errors |
| P3-03 | Backend Foundation | Add DB layer and transaction helpers | Data access utilities | P2-02, P3-01 | CRUD operations run through typed services |
| P3-04 | Backend Foundation | Add websocket server + connection lifecycle | Realtime transport layer | P3-01 | Client can connect and receive heartbeat/snapshot |
| P4-01 | Market Module | Implement `GET /quotes` and `GET /klines` | Market read APIs | P3-03 | Endpoints return typed and validated data |
| P4-02 | Market Module | Implement provider abstraction (`mock` + `real`) | Pluggable market provider | P4-01 | Toggle provider via config without code change |
| P4-03 | Scanner Module | Implement `GET /scan/results`, `POST /scan/run` | Scanner APIs | P4-01 | Scan results persist and refresh correctly |
| P4-04 | Account Module | Implement summary/equity/positions endpoints | Account APIs | P3-03 | Snapshot math consistent with positions/fills |
| P5-01 | Orders/Fills | Implement `GET /orders`, `POST /orders` | Order create/list API | P3-03, P4-01, P4-04 | Market orders accepted with cash/risk checks |
| P5-02 | Orders/Fills | Implement `DELETE /orders/:id` cancel logic | Order cancel API | P5-01 | Open orders can be cancelled deterministically |
| P5-03 | Orders/Fills | Implement fill generation and `GET /fills` | Fill lifecycle + query API | P5-01 | Partial/full fills update order status correctly |
| P5-04 | Orders/Fills | Emit `order.updated` and `fill.created` events | Realtime order stream | P3-04, P5-03 | Frontend can update without polling |
| P6-01 | Risk | Implement risk rules read/update endpoints | `GET/PATCH /risk/rules` | P3-03 | Rules are persisted and validated |
| P6-02 | Risk | Implement checks: cash, symbol exposure, gross exposure, max drawdown | Risk engine service | P6-01, P5-01, P4-04 | Violations block actions or emit risk events |
| P6-03 | Risk | Implement `GET /risk/events` + `risk.triggered` websocket event | Risk event stream | P6-02, P3-04 | Triggered events visible in realtime and history |
| P7-01 | Strategy | Implement `GET /strategies`, `POST /strategies`, `PATCH /strategies/:id` | Strategy config APIs | P3-03 | Strategies are persisted and editable |
| P7-02 | Runs | Implement `GET /runs`, `POST /runs/start`, `POST /runs/:id/stop` | Run lifecycle APIs | P7-01, P6-02 | Single active run constraint enforced |
| P7-03 | Runs | Emit `run.updated` and `account.updated` events | Runtime state push | P3-04, P7-02 | Runtime status updates push to active clients |
| P8-01 | History | Implement `GET /history/runs` summaries | Run history list API | P7-02, P4-04 | Includes metrics and status snapshot |
| P8-02 | History | Implement `GET /history/runs/:id` detail view | Run detail API | P8-01 | Includes fills, risk events, and snapshots |
| P8-03 | History | Implement retention/query strategy for snapshots | Historical data consistency | P2-04, P8-01 | Query latency acceptable with sample volume |
| P9-01 | Frontend Foundation | Build app shell in `v1/frontend/src/app` aligned to template semantics | Route + layout framework | P0-02, P1-01, P1-02 | All V1 routes accessible with stable shell |
| P9-02 | Frontend Foundation | Implement shared theme tokens + primitives in `src/shared/theme` | Tokenized design system | P9-01 | Visual hierarchy matches V1 requirements |
| P9-03 | Frontend Foundation | Add API client, websocket client, query hooks | `src/shared/api` data layer | P3-02, P3-04 | Retry/reconnect and cache behavior stable |
| P9-04 | Frontend Foundation | Define `src/entities` domain mappers and types | Shared domain contracts | P3-02, P9-03 | Backend responses mapped without page-local hacks |
| P10-01 | Dashboard Page | Build dashboard widgets wired to `/quotes`, `/klines`, `/scan/results`, `/account/summary` | Live dashboard | P4-01, P4-03, P4-04, P9-03 | Dashboard shows realtime updates via websocket |
| P10-02 | Orders Page | Build orders/activity table and controls with real order/fill data | Orders and activity page | P5-01, P5-03, P9-03 | Place/cancel/order status reflected in realtime |
| P10-03 | Strategy Page | Build strategy create/edit page with persistence | Strategy config page | P7-01, P9-03 | Create/edit survives refresh and reload |
| P10-04 | Run Control Page | Build run start/stop controls and runtime state panel | Run control page | P7-02, P7-03, P9-03 | User can start and stop one active run |
| P10-05 | History Page | Build run history list and detail panels | Run history page | P8-01, P8-02, P9-03 | Historical metrics and events are inspectable |
| P11-01 | Reliability | Implement websocket reconnect-safe hydration using `snapshot` event | Reconnect strategy | P3-04, P9-03 | State recovers correctly after reconnect |
| P11-02 | Reliability | Add backend tests for order/risk/account consistency | Test suite (backend) | P5-03, P6-02 | Core state transitions covered |
| P11-03 | Reliability | Add frontend integration tests for critical user loops | Test suite (frontend) | P10-01..P10-05 | Main loop passes automated checks |
| P11-04 | Reliability | Add structured logging and error boundary handling | Operability baseline | P3-01, P9-01 | Failures are traceable and user-safe |
| P12-01 | Release Readiness | Verify V1 acceptance criteria checklist | `v1/docs/v1-acceptance.md` | P11-01..P11-04 | All acceptance items marked pass |
| P12-02 | Release Readiness | Produce runbook for local setup and operations | `v1/docs/runbook.md` | P12-01 | New developer can run project end-to-end |

## 4) Execution Priority (Recommended)

1. P0 -> P3 (foundation)
2. P4 + P5 + P6 (core trading loop)
3. P7 + P8 (strategy/runs/history)
4. P9 + P10 (frontend integration by page)
5. P11 + P12 (stability and acceptance)

## 5) Definition of Done for V1

- No shipped page depends on hardcoded mock data.
- Dashboard and Orders/Activity visibly react to websocket events.
- Orders, fills, positions, and account snapshots remain internally consistent.
- User can complete the loop: inspect -> place order -> run/stop -> review history.
- Visual language remains aligned to the template's restrained operator-focused style.
