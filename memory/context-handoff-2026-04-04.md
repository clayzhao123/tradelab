# Context Handoff - 2026-04-04

## Objective

Make cloned template frontend actually usable by wiring each module to backend contracts, cleaning mock-only code, and validating by lint/build/test.

## Done

1. API/Data Layer
- Expanded frontend API client with risk/equity/scan typed contracts.
- Rebuilt `DataContext` with:
  - symbol/timeframe aware kline loading
  - scan trigger and refresh
  - risk rules/events refresh and patch
  - websocket snapshot/dashboard event hydration safeguards
  - order filter refresh lifecycle

2. Module Wiring
- Dashboard: real quote/scan/account/klines path, timeframe switch, scan refresh action.
- Orders: place/cancel/list/fills fully wired.
- Strategy: create + enable/disable persisted strategies.
- Runner: start/stop active run + patch risk rules.
- History: run summary/detail inspection stable.
- Backtest: uses real history snapshots and fills for analytics, removed random mock chart.

3. Cleanup
- Removed fake data fallbacks and simulated async strategy creation.
- Fixed topbar behavior and drawdown display semantics.
- Fixed Vite ESM config path handling.
- Excluded unused template `src/app/components/ui/**` from app TypeScript build.
- Set `build.emptyOutDir=false` to avoid dist cleanup permission failure.

## Verification Snapshot

- `npm run lint --workspace frontend` PASS
- `npm run test --workspace frontend` PASS
- `npm run build --workspace frontend` PASS
- `npm test` PASS
- `npm run build` PASS

## Known Follow-up

- Main bundle size warning remains; add route-level code splitting later.
- `src/app/components/ui/**` remains as template assets (not runtime), excluded from app compile.
