# Frontend Usability Audit (2026-04-04)

## Scope

- Workspace: `frontend/` + `backend/`
- Goal: verify each page interaction is wired to backend APIs/websocket, remove mock-driven behavior, and confirm build/test health.

## Interaction Mapping

| Module | Key Interaction | Backend Contract | Result |
|---|---|---|---|
| Live Dashboard (`/`) | Watchlist symbol switch -> chart reload | `GET /api/v1/klines?symbol=&timeframe=&limit=` | Wired |
| Live Dashboard (`/`) | Market/account hydration | `GET /api/v1/quotes`, `GET /api/v1/account/summary`, `GET /api/v1/account/positions` | Wired |
| Live Dashboard (`/`) | Scan refresh button | `POST /api/v1/scan/run`, `GET /api/v1/scan/results` | Wired |
| Live Dashboard (`/`) | Realtime updates | websocket `snapshot`, `dashboard.updated`, `account.updated`, `run.updated` | Wired |
| Orders (`/orders`) | Filter/search orders | `GET /api/v1/orders`, `GET /api/v1/fills` | Wired |
| Orders (`/orders`) | Place market/limit order | `POST /api/v1/orders` | Wired |
| Orders (`/orders`) | Cancel open/new/partial order | `DELETE /api/v1/orders/:id` | Wired |
| Strategy (`/strategy`) | Indicator fusion -> create strategy | `POST /api/v1/strategies` | Wired |
| Strategy (`/strategy`) | Enable/disable strategy | `PATCH /api/v1/strategies/:id` | Wired |
| Bot Runner (`/runner`) | Start run | `POST /api/v1/runs/start` | Wired |
| Bot Runner (`/runner`) | Stop run | `POST /api/v1/runs/:id/stop` | Wired |
| Bot Runner (`/runner`) | Update risk controls | `PATCH /api/v1/risk/rules`, `GET /api/v1/risk/rules` | Wired |
| Session History (`/history`) | List runs + inspect detail | `GET /api/v1/history/runs`, `GET /api/v1/history/runs/:id` | Wired |
| Backtest (`/backtest`) | Load historical run analytics from snapshots | `GET /api/v1/history/runs/:id` (summary/fills/risk/snapshots) | Wired |

## Mock/Redundant Code Cleanup

- Removed dashboard chart mock fallback (`Math.random`) and switched to strict real data / empty state.
- Removed scan table mock rows and replaced with backend-driven data only.
- Reworked strategy page to remove artificial timeout/"AI sim" flow.
- Reworked backtest page to remove synthetic equity curve and use real run snapshots.
- Reworked orders page from read-only table to executable order workflow (place + cancel + fills).
- Removed non-functional topbar run toggle click behavior.
- Fixed corrupted/garbled symbols in orders UI text.
- Fixed Vite ESM config issue (`__dirname` -> `fileURLToPath(import.meta.url)`).
- Excluded unused template `src/app/components/ui/**` from app TypeScript build to prevent missing dependency breakage from non-runtime files.
- Disabled Vite output directory cleaning in build (`emptyOutDir: false`) to avoid permission failure when deleting `dist/`.

## Validation Results

- `npm run lint --workspace frontend` -> PASS
- `npm run build --workspace frontend` -> PASS
- `npm run test --workspace frontend` -> PASS
- `npm run build` (root workspace) -> PASS
- `npm test` (root workspace) -> PASS

## Remaining Risks / Notes

- Frontend bundle has a large main chunk warning (>500kb). Functional, but should be optimized with route-level code splitting in a later pass.
- Backtest now represents historical-run analytics (history replay), not a separate simulation engine endpoint.
- Template `ui` component library remains in tree but is excluded from app TS build because it is currently unused runtime code.
