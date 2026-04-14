# Strategy Fusion Core (Simple Explanation)

This document explains how strategy fusion works in V1 in plain language.

## 1. What "fusion" means

A strategy is not a single indicator.
It is a weighted combination of multiple indicators selected in Strategy Lab.

At runtime, the system does:

`composite(t) = sum(factor_score_k(t) * factor_weight_k)`

Then it converts `composite(t)` into trading actions:

- `composite >= long_threshold` -> `LONG`
- `composite <= short_threshold` -> `SHORT`
- otherwise -> `NEUTRAL`

## 2. How indicator weights become factor weights

Users assign indicator weights (must total 100%).
Those indicator weights are mapped into 6 core factors:

- `trend`
- `momentum`
- `meanReversion`
- `volatility`
- `volume`
- `structure`

Each indicator carries `labels` and `family`.
The backend maps labels/family to one or more factors.

If one indicator maps to multiple factors, its weight is split evenly across them.
After aggregation, factor weights are normalized so total = 1.0.

## 3. How each factor score is computed

Per K-line, backend computes six normalized scores (roughly in [-1, 1]):

- `trendScore`: EMA12 vs EMA26 trend spread
- `momentumScore`: short-horizon price change
- `meanReversionScore`: distance to rolling mean (with rolling std)
- `volatilityScore`: ATR-based volatility penalty
- `volumeScore`: current volume vs recent average
- `structureScore`: price position inside recent high-low structure range

These six scores are fused by factor weights into `composite`.

## 4. Decision intensity mode (new)

Backtest now supports:

- `aggressive`
- `neutral`
- `conservative`

The key idea:
threshold is auto-derived from this strategy's own composite distribution, not hard-coded.

Implementation:

1. Build composite series across selected symbols/timeframe/lookback.
2. Use `abs(composite)` values.
3. Pick quantile by mode:
   - aggressive: 58%
   - neutral: 70%
   - conservative: 82%
4. Set symmetric thresholds:
   - `long = +T`
   - `short = -T`

So different strategies, symbols, and weights naturally produce different thresholds.

## 5. Why this is better than fixed 0.22

Fixed thresholds are easy but insensitive to strategy style.
Auto thresholds adapt to the actual composite signal scale of the selected fusion.

This gives:

- more comparable behavior across different fusion configurations
- intensity control without arbitrary magic constants
- clearer "aggressive vs conservative" semantics

## 6. Scope in current implementation

Implemented now:

- Backtest auto-threshold by decision mode
- Backtest response returns the actual threshold used

Not yet included in this step:

- Live run execution using the same dynamic threshold pipeline

