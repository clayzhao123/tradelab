-- TradeLab V1 canonical schema (PostgreSQL)
-- Keep this file aligned with the latest migration set.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status') THEN
    CREATE TYPE run_status AS ENUM ('pending', 'running', 'stopped', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_side') THEN
    CREATE TYPE order_side AS ENUM ('buy', 'sell');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop', 'stop_limit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('new', 'open', 'partial', 'filled', 'cancelled', 'rejected', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_severity') THEN
    CREATE TYPE risk_severity AS ENUM ('info', 'warning', 'critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_run_status') THEN
    CREATE TYPE scan_run_status AS ENUM ('queued', 'running', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'snapshot_source') THEN
    CREATE TYPE snapshot_source AS ENUM ('startup', 'interval', 'fill', 'risk_event', 'run_start', 'run_stop', 'manual');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_provider_settings (
  provider TEXT PRIMARY KEY,
  api_key TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  strategy_name TEXT,
  strategy_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  factor_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_threshold JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeframe TEXT NOT NULL,
  lookback_bars INTEGER NOT NULL CHECK (lookback_bars >= 1),
  initial_capital NUMERIC(20, 8) NOT NULL CHECK (initial_capital > 0),
  symbols TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  symbols_count INTEGER NOT NULL DEFAULT 0 CHECK (symbols_count >= 0),
  portfolio_total_return_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_max_drawdown_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_win_rate_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_volatility_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_sharpe NUMERIC(12, 6) NOT NULL DEFAULT 0,
  portfolio_avg_stability_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_long_bars_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_short_bars_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_flat_bars_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_long_return_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_short_return_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  portfolio_best_symbol TEXT,
  portfolio_worst_symbol TEXT,
  generated_at TIMESTAMPTZ NOT NULL,
  request_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_backtest_runs_generated_at ON backtest_runs(generated_at DESC);

CREATE TABLE IF NOT EXISTS backtest_symbol_results (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  total_return_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  max_drawdown_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  win_rate_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  volatility_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  sharpe NUMERIC(12, 6) NOT NULL DEFAULT 0,
  trades INTEGER NOT NULL DEFAULT 0,
  stability_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  long_bars_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  short_bars_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  flat_bars_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  long_return_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  short_return_pct NUMERIC(12, 4) NOT NULL DEFAULT 0,
  UNIQUE (run_id, symbol)
);

CREATE INDEX IF NOT EXISTS ix_backtest_symbol_results_run_id ON backtest_symbol_results(run_id);

CREATE TABLE IF NOT EXISTS backtest_portfolio_points (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq >= 1),
  ts TIMESTAMPTZ NOT NULL,
  equity NUMERIC(20, 8) NOT NULL,
  UNIQUE (run_id, seq)
);

CREATE INDEX IF NOT EXISTS ix_backtest_portfolio_points_run_id_seq ON backtest_portfolio_points(run_id, seq);

CREATE TABLE IF NOT EXISTS backtest_symbol_price_points (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK (seq >= 1),
  ts TIMESTAMPTZ NOT NULL,
  price NUMERIC(20, 8) NOT NULL CHECK (price >= 0),
  UNIQUE (run_id, symbol, seq)
);

CREATE INDEX IF NOT EXISTS ix_backtest_symbol_price_points_run_symbol_seq ON backtest_symbol_price_points(run_id, symbol, seq);

CREATE TABLE IF NOT EXISTS backtest_symbol_trade_return_points (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  trade_index INTEGER NOT NULL CHECK (trade_index >= 1),
  return_pct NUMERIC(12, 4) NOT NULL,
  UNIQUE (run_id, symbol, trade_index)
);

CREATE INDEX IF NOT EXISTS ix_backtest_symbol_trade_return_points_run_symbol ON backtest_symbol_trade_return_points(run_id, symbol);

CREATE TABLE IF NOT EXISTS backtest_symbol_trade_markers (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  marker_id INTEGER NOT NULL CHECK (marker_id >= 1),
  trade_index INTEGER NOT NULL CHECK (trade_index >= 1),
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  ts TIMESTAMPTZ NOT NULL,
  price NUMERIC(20, 8) NOT NULL CHECK (price >= 0),
  linked_marker_id INTEGER,
  linked_ts TIMESTAMPTZ,
  linked_price NUMERIC(20, 8),
  UNIQUE (run_id, symbol, marker_id)
);

CREATE INDEX IF NOT EXISTS ix_backtest_symbol_trade_markers_run_symbol ON backtest_symbol_trade_markers(run_id, symbol);

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  status run_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT,
  initial_cash NUMERIC(18, 2) NOT NULL CHECK (initial_cash >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status <> 'running') OR (started_at IS NOT NULL)),
  CHECK ((stopped_at IS NULL) OR (started_at IS NULL) OR (stopped_at >= started_at))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_runs_single_active ON runs ((status))
WHERE status = 'running';

CREATE TABLE IF NOT EXISTS risk_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_symbol_exposure_pct NUMERIC(8, 4) NOT NULL CHECK (max_symbol_exposure_pct > 0 AND max_symbol_exposure_pct <= 1),
  max_gross_exposure_pct NUMERIC(8, 4) NOT NULL CHECK (max_gross_exposure_pct > 0 AND max_gross_exposure_pct <= 2),
  max_drawdown_pct NUMERIC(8, 4) NOT NULL CHECK (max_drawdown_pct > 0 AND max_drawdown_pct <= 1),
  min_cash_balance NUMERIC(18, 2) NOT NULL CHECK (min_cash_balance >= 0),
  max_order_notional NUMERIC(18, 2) NOT NULL CHECK (max_order_notional > 0),
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id),
  strategy_id UUID REFERENCES strategies(id),
  client_order_id TEXT UNIQUE,
  symbol TEXT NOT NULL,
  side order_side NOT NULL,
  type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'new',
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  limit_price NUMERIC(20, 8),
  stop_price NUMERIC(20, 8),
  filled_quantity NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  avg_fill_price NUMERIC(20, 8),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  rejected_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (filled_quantity <= quantity),
  CHECK (
    (type = 'market' AND limit_price IS NULL AND stop_price IS NULL) OR
    (type = 'limit' AND limit_price IS NOT NULL) OR
    (type = 'stop' AND stop_price IS NOT NULL) OR
    (type = 'stop_limit' AND limit_price IS NOT NULL AND stop_price IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_orders_status_requested_at ON orders(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS ix_orders_run_id_requested_at ON orders(run_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS ix_orders_symbol_status ON orders(symbol, status);

CREATE TABLE IF NOT EXISTS fills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  run_id UUID REFERENCES runs(id),
  symbol TEXT NOT NULL,
  side order_side NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20, 8) NOT NULL CHECK (price > 0),
  fee NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  liquidity TEXT NOT NULL DEFAULT 'taker',
  filled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_fills_order_id_filled_at ON fills(order_id, filled_at DESC);
CREATE INDEX IF NOT EXISTS ix_fills_run_id_filled_at ON fills(run_id, filled_at DESC);
CREATE INDEX IF NOT EXISTS ix_fills_symbol_filled_at ON fills(symbol, filled_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  symbol TEXT PRIMARY KEY,
  run_id UUID REFERENCES runs(id),
  quantity NUMERIC(20, 8) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (avg_cost >= 0),
  market_price NUMERIC(20, 8) CHECK (market_price IS NULL OR market_price >= 0),
  market_value NUMERIC(20, 8) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_positions_run_id ON positions(run_id);

CREATE TABLE IF NOT EXISTS account_snapshots (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID REFERENCES runs(id),
  source snapshot_source NOT NULL DEFAULT 'interval',
  cash_balance NUMERIC(18, 2) NOT NULL CHECK (cash_balance >= 0),
  equity NUMERIC(18, 2) NOT NULL CHECK (equity >= 0),
  buying_power NUMERIC(18, 2) NOT NULL CHECK (buying_power >= 0),
  gross_exposure NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (gross_exposure >= 0),
  net_exposure NUMERIC(18, 2) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  drawdown_pct NUMERIC(8, 4) NOT NULL DEFAULT 0 CHECK (drawdown_pct >= 0 AND drawdown_pct <= 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_account_snapshots_run_id_created_at ON account_snapshots(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_account_snapshots_created_at ON account_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id),
  rule_name TEXT NOT NULL,
  severity risk_severity NOT NULL,
  symbol TEXT,
  observed_value NUMERIC(20, 8),
  limit_value NUMERIC(20, 8),
  message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_risk_events_run_id_occurred_at ON risk_events(run_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_risk_events_rule_name_occurred_at ON risk_events(rule_name, occurred_at DESC);

CREATE TABLE IF NOT EXISTS scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status scan_run_status NOT NULL DEFAULT 'queued',
  requested_symbols TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  timeframe TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status <> 'running') OR (started_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_scan_runs_created_at ON scan_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id UUID NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  signal TEXT NOT NULL,
  score NUMERIC(10, 4) NOT NULL,
  last_price NUMERIC(20, 8),
  change_24h_pct NUMERIC(10, 4),
  volume_24h NUMERIC(24, 8),
  rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scan_run_id, symbol)
);

CREATE INDEX IF NOT EXISTS ix_scan_results_scan_run_id_score ON scan_results(scan_run_id, score DESC);
CREATE INDEX IF NOT EXISTS ix_scan_results_symbol_created_at ON scan_results(symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS market_quotes (
  symbol TEXT PRIMARY KEY,
  bid NUMERIC(20, 8),
  ask NUMERIC(20, 8),
  last NUMERIC(20, 8) NOT NULL CHECK (last >= 0),
  mark NUMERIC(20, 8),
  quote_volume_24h NUMERIC(24, 8),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (bid IS NULL OR bid >= 0),
  CHECK (ask IS NULL OR ask >= 0),
  CHECK (mark IS NULL OR mark >= 0),
  CHECK (ask IS NULL OR bid IS NULL OR ask >= bid)
);

CREATE TABLE IF NOT EXISTS market_klines (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ NOT NULL,
  open NUMERIC(20, 8) NOT NULL CHECK (open >= 0),
  high NUMERIC(20, 8) NOT NULL CHECK (high >= 0),
  low NUMERIC(20, 8) NOT NULL CHECK (low >= 0),
  close NUMERIC(20, 8) NOT NULL CHECK (close >= 0),
  volume NUMERIC(24, 8) NOT NULL CHECK (volume >= 0),
  trades BIGINT NOT NULL DEFAULT 0 CHECK (trades >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (close_time > open_time),
  CHECK (high >= low),
  CHECK (high >= open AND high >= close),
  CHECK (low <= open AND low <= close),
  UNIQUE (symbol, timeframe, open_time)
);

CREATE INDEX IF NOT EXISTS ix_market_klines_symbol_timeframe_open_time ON market_klines(symbol, timeframe, open_time DESC);
