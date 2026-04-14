# Context Handoff (Compressed)

- Date: 2026-04-04
- Trigger: Context compression for task relay (95% threshold policy)
- Workspace: `e:\workspace\tradelab\v1`

## User Target (Current Session)
1. Live Dashboard:
   - clarify/optimize refresh frequency
   - watchlist = top 100 market-cap `XXX/USDT`, daily refresh
   - fix chart rendering and timeframe switching
   - clarify scan basis
2. Strategy Lab:
   - greatly expand indicator universe
   - multi-label classification + label filtering
   - weighted fusion per indicator (sum = 100%)
   - strategy delete capability
3. Backtest:
   - real module based on selected symbols + historical curves
   - frequency by day/month/year line
   - per-symbol results for stability/performance comparison

## Implemented Changes (High-Level)

### Backend
- Added market watchlist API:
  - `GET /api/v1/market/watchlist?limit=`
  - returns provider, updatedAt, nextRefreshAt, ranked items.
- Added top-100 fallback watchlist seed and market-cap entry type.
- Extended market provider interface with top-watchlist capability.
- Upgraded `real` market provider:
  - real quotes via Binance ticker endpoint
  - real klines via Binance klines endpoint
  - watchlist sourcing via CoinGecko + Binance tradable USDT filter
  - automatic fallback to mock on failures.
- Upgraded `mock` market provider:
  - synthetic quote generation for missing symbols
  - synthetic kline generation for arbitrary symbol/timeframe
  - top-watchlist support.
- Added scan factor model:
  - momentum / volume / volatility / liquidity factors
  - score from weighted factor blend
  - basis tags included in result payload.
- Added strategy deletion:
  - `DELETE /api/v1/strategies/:id`
  - conflict guard if strategy has active run.
- Added backtest module:
  - `POST /api/v1/backtest/run`
  - outputs per-symbol metrics + portfolio analytics + equity curves.
- Added DB transaction methods:
  - `deleteStrategy`
  - `upsertKlines`
  - safer strategy params clone via `structuredClone`.
- Registered new backtest routes/service in app bootstrap.

### Frontend
- API client extended for:
  - market watchlist
  - strategy delete
  - backtest run
  - richer scan result fields.
- `requestJson` upgraded to handle `204 No Content` correctly.
- `DataContext`:
  - watchlist state + timestamps
  - dashboard refresh interval constant (10s)
  - dashboard refresh now uses backend top-100 watchlist
  - scan universe derived from watchlist subset
  - deleteStrategy action exposed.
- Dashboard:
  - watchlist-driven left list (with rank)
  - scan trigger aligned with new universe
  - MainArea receives refresh/watchlist metadata.
- MainArea:
  - fixed timeframe options (`1m/5m/15m/1h/4h/1d/1w/1M`)
  - displays refresh interval + watchlist update metadata
  - displays scan basis text.
- Candlestick chart:
  - rewritten x/y scaling and dynamic axis labels from kline timestamps
  - removed hardcoded static time labels.
- Scan table:
  - now displays factor columns (M/V/Vol) + basis details.
- Strategy page:
  - rebuilt with large indicator catalog + family/label filters + search
  - per-indicator weighted fusion editor (auto rebalance to total 100%)
  - formula/logic preview
  - persisted strategy delete button.
- Added indicator catalog constants file with multi-family/multi-label definitions.
- Backtest page:
  - rewritten to run real backtest API with strategy/symbol/timeframe/params
  - symbol multi-select from top watchlist
  - per-symbol metrics table + portfolio equity chart.

## Validation Status
- `npm run lint --workspace frontend` PASS
- `npm run test --workspace frontend` PASS
- `npm run test --workspace backend` PASS
- `npm run build` PASS
- `npm test` PASS

## Remaining/Active Notes
- One minor in-progress adjustment was being applied to `Backtest.tsx` around timeframe-driven lookback defaults when this context-compression request arrived; core build/tests are already green.
- If continuing, re-open `frontend/src/app/pages/Backtest.tsx` and optionally refine default lookback behaviors for 1D/1M/1Y presets.

## Key Files Touched
- `backend/src/modules/market/top-usdt-watchlist.ts`
- `backend/src/modules/market/providers/market-provider.ts`
- `backend/src/modules/market/providers/mock-market-provider.ts`
- `backend/src/modules/market/providers/real-market-provider.ts`
- `backend/src/modules/market/market.service.ts`
- `backend/src/modules/market/market.routes.ts`
- `backend/src/modules/scanner/scanner.service.ts`
- `backend/src/modules/backtest/backtest.routes.ts`
- `backend/src/modules/backtest/backtest.service.ts`
- `backend/src/modules/strategies/strategies.routes.ts`
- `backend/src/modules/strategies/strategies.service.ts`
- `backend/src/db/memory-db.ts`
- `backend/src/shared/schemas.ts`
- `backend/src/domain/types.ts`
- `backend/src/app/register-routes.ts`
- `backend/src/app/create-app.ts`
- `backend/src/modules/ws/websocket-gateway.ts`
- `backend/src/tests/run-tests.ts`
- `frontend/src/shared/api/client.ts`
- `frontend/src/app/contexts/DataContext.tsx`
- `frontend/src/app/pages/Dashboard.tsx`
- `frontend/src/app/components/MainArea.tsx`
- `frontend/src/app/components/LeftSidebar.tsx`
- `frontend/src/app/components/CandlestickChart.tsx`
- `frontend/src/app/components/ScanTable.tsx`
- `frontend/src/app/constants/indicatorCatalog.ts`
- `frontend/src/app/pages/Strategy.tsx`
- `frontend/src/app/pages/Backtest.tsx`

## Compression Policy (Persisted)
- When context usage approaches 95%, auto-generate a compressed handoff markdown under `memory/` for seamless continuation.
