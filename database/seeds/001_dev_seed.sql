-- 001_dev_seed.sql
-- Development seed dataset for core UI flows.

BEGIN;

-- Strategies
INSERT INTO strategies (id, name, description, is_enabled, params)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Momentum Breakout',
    'Breakout strategy with volatility and volume filter.',
    TRUE,
    '{"timeframe":"15m","lookback":20,"atrMult":1.5,"takeProfitPct":0.03,"stopLossPct":0.015}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Mean Reversion VWAP',
    'Revert to VWAP with tight risk controls.',
    TRUE,
    '{"timeframe":"5m","stdDevBand":2.1,"maxHoldMinutes":45,"takeProfitPct":0.012,"stopLossPct":0.008}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Risk rules
INSERT INTO risk_rules (
  id,
  name,
  is_enabled,
  max_symbol_exposure_pct,
  max_gross_exposure_pct,
  max_drawdown_pct,
  min_cash_balance,
  max_order_notional,
  extra
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'default-paper-risk',
  TRUE,
  0.2500,
  1.2000,
  0.1200,
  500.00,
  15000.00,
  '{"notes":"Default V1 safety envelope"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Runs
INSERT INTO runs (id, strategy_id, status, started_at, stopped_at, stop_reason, initial_cash, notes)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'running',
    NOW() - INTERVAL '30 minutes',
    NULL,
    NULL,
    100000.00,
    'Current active run'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'completed',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '6 hours',
    'Completed normally',
    100000.00,
    'Reference historical run'
  )
ON CONFLICT (id) DO NOTHING;

-- Orders
INSERT INTO orders (
  id, run_id, strategy_id, client_order_id, symbol, side, type, status, quantity, limit_price,
  stop_price, filled_quantity, avg_fill_price, requested_at, opened_at, cancelled_at, rejected_reason, metadata
)
VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'ORD-BTC-0001',
    'BTCUSDT',
    'buy',
    'market',
    'filled',
    0.25000000,
    NULL,
    NULL,
    0.25000000,
    68250.12000000,
    NOW() - INTERVAL '25 minutes',
    NOW() - INTERVAL '25 minutes',
    NULL,
    NULL,
    '{"source":"strategy","tag":"entry"}'::jsonb
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'ORD-ETH-0002',
    'ETHUSDT',
    'sell',
    'limit',
    'open',
    1.50000000,
    3620.00000000,
    NULL,
    0.00000000,
    NULL,
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '10 minutes',
    NULL,
    NULL,
    '{"source":"manual","tag":"reduce"}'::jsonb
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'ORD-SOL-0003',
    'SOLUSDT',
    'buy',
    'market',
    'filled',
    200.00000000,
    NULL,
    NULL,
    200.00000000,
    146.33000000,
    NOW() - INTERVAL '2 days' + INTERVAL '1 hours',
    NOW() - INTERVAL '2 days' + INTERVAL '1 hours',
    NULL,
    NULL,
    '{"source":"strategy","tag":"swing"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Fills
INSERT INTO fills (id, order_id, run_id, symbol, side, quantity, price, fee, liquidity, filled_at)
VALUES
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333333',
    'BTCUSDT',
    'buy',
    0.15000000,
    68240.11000000,
    2.04800000,
    'taker',
    NOW() - INTERVAL '25 minutes'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333333',
    'BTCUSDT',
    'buy',
    0.10000000,
    68265.14000000,
    1.36500000,
    'taker',
    NOW() - INTERVAL '24 minutes'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '55555555-5555-5555-5555-555555555553',
    '44444444-4444-4444-4444-444444444444',
    'SOLUSDT',
    'buy',
    200.00000000,
    146.33000000,
    4.20000000,
    'maker',
    NOW() - INTERVAL '2 days' + INTERVAL '1 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- Positions
INSERT INTO positions (symbol, run_id, quantity, avg_cost, market_price, market_value, unrealized_pnl, realized_pnl, updated_at)
VALUES
  ('BTCUSDT', '33333333-3333-3333-3333-333333333333', 0.25000000, 68250.12000000, 68520.51000000, 17130.12750000, 67.59750000, 0.00000000, NOW()),
  ('ETHUSDT', '33333333-3333-3333-3333-333333333333', -0.75000000, 3595.80000000, 3604.20000000, -2703.15000000, -6.30000000, 112.44000000, NOW()),
  ('SOLUSDT', '44444444-4444-4444-4444-444444444444', 0.00000000, 146.33000000, 148.92000000, 0.00000000, 0.00000000, 518.00000000, NOW())
ON CONFLICT (symbol) DO UPDATE SET
  run_id = EXCLUDED.run_id,
  quantity = EXCLUDED.quantity,
  avg_cost = EXCLUDED.avg_cost,
  market_price = EXCLUDED.market_price,
  market_value = EXCLUDED.market_value,
  unrealized_pnl = EXCLUDED.unrealized_pnl,
  realized_pnl = EXCLUDED.realized_pnl,
  updated_at = EXCLUDED.updated_at;

-- Account snapshots
INSERT INTO account_snapshots (
  run_id, source, cash_balance, equity, buying_power, gross_exposure, net_exposure,
  unrealized_pnl, realized_pnl, drawdown_pct, metadata, created_at
)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    'run_start',
    100000.00,
    100000.00,
    100000.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.0000,
    '{"checkpoint":"start"}'::jsonb,
    NOW() - INTERVAL '30 minutes'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'interval',
    82500.42,
    100173.56,
    81800.00,
    19833.28,
    14426.98,
    61.29,
    112.44,
    0.0140,
    '{"checkpoint":"realtime"}'::jsonb,
    NOW() - INTERVAL '2 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'run_stop',
    100518.00,
    100518.00,
    100518.00,
    0.00,
    0.00,
    0.00,
    518.00,
    0.0310,
    '{"checkpoint":"completed"}'::jsonb,
    NOW() - INTERVAL '2 days' + INTERVAL '6 hours'
  );

-- Risk events
INSERT INTO risk_events (id, run_id, rule_name, severity, symbol, observed_value, limit_value, message, context, occurred_at)
VALUES
  (
    '77777777-7777-7777-7777-777777777771',
    '33333333-3333-3333-3333-333333333333',
    'max_symbol_exposure_pct',
    'warning',
    'BTCUSDT',
    0.2412,
    0.2500,
    'BTC symbol exposure is near configured limit.',
    '{"utilizationPct":96.48}'::jsonb,
    NOW() - INTERVAL '3 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- Scan run and results
INSERT INTO scan_runs (id, status, requested_symbols, timeframe, started_at, completed_at, error_message, created_at)
VALUES (
  '88888888-8888-8888-8888-888888888881',
  'completed',
  ARRAY['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'],
  '15m',
  NOW() - INTERVAL '4 minutes',
  NOW() - INTERVAL '3 minutes',
  NULL,
  NOW() - INTERVAL '4 minutes'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO scan_results (id, scan_run_id, symbol, signal, score, last_price, change_24h_pct, volume_24h, rationale, created_at)
VALUES
  (
    '99999999-9999-9999-9999-999999999991',
    '88888888-8888-8888-8888-888888888881',
    'BTCUSDT',
    'long',
    0.9210,
    68520.51000000,
    2.4410,
    22850000000.00000000,
    '{"reasons":["breakout","volume expansion","trend alignment"]}'::jsonb,
    NOW() - INTERVAL '3 minutes'
  ),
  (
    '99999999-9999-9999-9999-999999999992',
    '88888888-8888-8888-8888-888888888881',
    'SOLUSDT',
    'long',
    0.8350,
    148.92000000,
    4.2200,
    1650000000.00000000,
    '{"reasons":["momentum continuation","volatility compression break"]}'::jsonb,
    NOW() - INTERVAL '3 minutes'
  ),
  (
    '99999999-9999-9999-9999-999999999993',
    '88888888-8888-8888-8888-888888888881',
    'ETHUSDT',
    'neutral',
    0.5220,
    3604.20000000,
    0.9800,
    9730000000.00000000,
    '{"reasons":["mixed signals"]}'::jsonb,
    NOW() - INTERVAL '3 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- Market snapshots
INSERT INTO market_quotes (symbol, bid, ask, last, mark, quote_volume_24h, updated_at)
VALUES
  ('BTCUSDT', 68519.90000000, 68521.12000000, 68520.51000000, 68520.20000000, 22850000000.00000000, NOW()),
  ('ETHUSDT', 3604.00000000, 3604.40000000, 3604.20000000, 3604.18000000, 9730000000.00000000, NOW()),
  ('SOLUSDT', 148.91000000, 148.93000000, 148.92000000, 148.91800000, 1650000000.00000000, NOW())
ON CONFLICT (symbol) DO UPDATE SET
  bid = EXCLUDED.bid,
  ask = EXCLUDED.ask,
  last = EXCLUDED.last,
  mark = EXCLUDED.mark,
  quote_volume_24h = EXCLUDED.quote_volume_24h,
  updated_at = EXCLUDED.updated_at;

INSERT INTO market_klines (symbol, timeframe, open_time, close_time, open, high, low, close, volume, trades)
VALUES
  ('BTCUSDT', '15m', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', 68110.00000000, 68350.00000000, 68090.00000000, 68220.00000000, 1210.55000000, 15420),
  ('BTCUSDT', '15m', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', 68220.00000000, 68440.00000000, 68180.00000000, 68390.00000000, 1392.21000000, 16680),
  ('BTCUSDT', '15m', NOW() - INTERVAL '15 minutes', NOW(), 68390.00000000, 68560.00000000, 68310.00000000, 68520.51000000, 1522.78000000, 17245),
  ('ETHUSDT', '15m', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', 3572.00000000, 3590.00000000, 3568.00000000, 3588.50000000, 9850.22000000, 12840),
  ('ETHUSDT', '15m', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', 3588.50000000, 3608.40000000, 3584.70000000, 3600.10000000, 10620.91000000, 13110),
  ('ETHUSDT', '15m', NOW() - INTERVAL '15 minutes', NOW(), 3600.10000000, 3609.90000000, 3596.20000000, 3604.20000000, 10112.45000000, 12760)
ON CONFLICT (symbol, timeframe, open_time) DO NOTHING;

COMMIT;

