-- 0002_strategy_ai_backtest_persistence.sql
-- Persist strategy/ai config/backtest history in PostgreSQL.

BEGIN;

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

COMMIT;
