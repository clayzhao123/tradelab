export type IndicatorFamily =
  | "trend"
  | "momentum"
  | "volatility"
  | "volume"
  | "mean_reversion"
  | "market_structure"
  | "statistical"
  | "risk"
  | "derivatives";

export type IndicatorDefinition = {
  id: string;
  name: string;
  description: string;
  family: IndicatorFamily;
  labels: string[];
  expectedEdge: number;
};

export const INDICATOR_CATALOG: IndicatorDefinition[] = [
  { id: "sma", name: "SMA", description: "Simple Moving Average", family: "trend", labels: ["trend", "moving-average", "lagging"], expectedEdge: 0.53 },
  { id: "ema", name: "EMA", description: "Exponential Moving Average", family: "trend", labels: ["trend", "moving-average", "responsive"], expectedEdge: 0.56 },
  { id: "wma", name: "WMA", description: "Weighted Moving Average", family: "trend", labels: ["trend", "moving-average", "responsive"], expectedEdge: 0.55 },
  { id: "hma", name: "HMA", description: "Hull Moving Average", family: "trend", labels: ["trend", "moving-average", "low-lag"], expectedEdge: 0.58 },
  { id: "kama", name: "KAMA", description: "Kaufman Adaptive Moving Average", family: "trend", labels: ["trend", "adaptive", "moving-average"], expectedEdge: 0.59 },
  { id: "tema", name: "TEMA", description: "Triple Exponential Moving Average", family: "trend", labels: ["trend", "moving-average", "low-lag"], expectedEdge: 0.57 },
  { id: "dema", name: "DEMA", description: "Double Exponential Moving Average", family: "trend", labels: ["trend", "moving-average", "low-lag"], expectedEdge: 0.56 },
  { id: "macd", name: "MACD", description: "Moving Average Convergence Divergence", family: "trend", labels: ["trend", "momentum", "oscillator"], expectedEdge: 0.61 },
  { id: "adx", name: "ADX", description: "Average Directional Index", family: "trend", labels: ["trend", "strength", "regime"], expectedEdge: 0.6 },
  { id: "dmi", name: "DMI", description: "Directional Movement Index", family: "trend", labels: ["trend", "strength", "breakout"], expectedEdge: 0.59 },
  { id: "supertrend", name: "Supertrend", description: "ATR-based trend filter", family: "trend", labels: ["trend", "volatility", "breakout"], expectedEdge: 0.62 },
  { id: "ichimoku", name: "Ichimoku Cloud", description: "Multi-line trend system", family: "trend", labels: ["trend", "support-resistance", "regime"], expectedEdge: 0.61 },
  { id: "psar", name: "Parabolic SAR", description: "Trailing stop trend indicator", family: "trend", labels: ["trend", "stop-system", "regime"], expectedEdge: 0.56 },
  { id: "aroon", name: "Aroon", description: "Trend emergence detector", family: "trend", labels: ["trend", "breakout", "regime"], expectedEdge: 0.55 },
  { id: "vortex", name: "Vortex Indicator", description: "Trend reversal detector", family: "trend", labels: ["trend", "reversal", "breakout"], expectedEdge: 0.55 },
  { id: "donchian", name: "Donchian Channel", description: "Highest-high / lowest-low channel", family: "trend", labels: ["trend", "breakout", "channel"], expectedEdge: 0.59 },
  { id: "price_channel", name: "Price Channel", description: "Envelope of recent extremes", family: "trend", labels: ["trend", "channel", "breakout"], expectedEdge: 0.56 },
  { id: "rsi", name: "RSI", description: "Relative Strength Index", family: "momentum", labels: ["momentum", "oscillator", "mean-reversion"], expectedEdge: 0.6 },
  { id: "stoch", name: "Stochastic Oscillator", description: "Location in recent range", family: "momentum", labels: ["momentum", "oscillator", "mean-reversion"], expectedEdge: 0.58 },
  { id: "stoch_rsi", name: "Stochastic RSI", description: "RSI momentum acceleration", family: "momentum", labels: ["momentum", "oscillator", "fast"], expectedEdge: 0.57 },
  { id: "cci", name: "CCI", description: "Commodity Channel Index", family: "momentum", labels: ["momentum", "oscillator", "deviation"], expectedEdge: 0.55 },
  { id: "roc", name: "ROC", description: "Rate of Change", family: "momentum", labels: ["momentum", "trend", "speed"], expectedEdge: 0.56 },
  { id: "mom", name: "Momentum", description: "Raw momentum", family: "momentum", labels: ["momentum", "trend", "speed"], expectedEdge: 0.54 },
  { id: "williams_r", name: "Williams %R", description: "Overbought / oversold oscillator", family: "momentum", labels: ["momentum", "oscillator", "mean-reversion"], expectedEdge: 0.56 },
  { id: "tsi", name: "TSI", description: "True Strength Index", family: "momentum", labels: ["momentum", "oscillator", "smoothing"], expectedEdge: 0.57 },
  { id: "mfi", name: "MFI", description: "Money Flow Index", family: "momentum", labels: ["momentum", "volume", "oscillator"], expectedEdge: 0.59 },
  { id: "ppo", name: "PPO", description: "Percentage Price Oscillator", family: "momentum", labels: ["momentum", "trend", "oscillator"], expectedEdge: 0.56 },
  { id: "trix", name: "TRIX", description: "Triple-smoothed momentum", family: "momentum", labels: ["momentum", "trend", "oscillator"], expectedEdge: 0.56 },
  { id: "uo", name: "Ultimate Oscillator", description: "Multi-horizon momentum", family: "momentum", labels: ["momentum", "oscillator", "multi-timeframe"], expectedEdge: 0.57 },
  { id: "cmo", name: "CMO", description: "Chande Momentum Oscillator", family: "momentum", labels: ["momentum", "oscillator", "mean-reversion"], expectedEdge: 0.55 },
  { id: "kst", name: "KST", description: "Know Sure Thing oscillator", family: "momentum", labels: ["momentum", "oscillator", "multi-timeframe"], expectedEdge: 0.56 },
  { id: "atr", name: "ATR", description: "Average True Range", family: "volatility", labels: ["volatility", "risk", "position-sizing"], expectedEdge: 0.54 },
  { id: "natr", name: "NATR", description: "Normalized ATR", family: "volatility", labels: ["volatility", "risk", "normalization"], expectedEdge: 0.53 },
  { id: "bb", name: "Bollinger Bands", description: "Std-dev volatility envelope", family: "volatility", labels: ["volatility", "mean-reversion", "channel"], expectedEdge: 0.61 },
  { id: "bb_percent_b", name: "Bollinger %B", description: "Band position metric", family: "volatility", labels: ["volatility", "momentum", "mean-reversion"], expectedEdge: 0.58 },
  { id: "keltner", name: "Keltner Channel", description: "ATR envelope around EMA", family: "volatility", labels: ["volatility", "trend", "channel"], expectedEdge: 0.57 },
  { id: "chaikin_vol", name: "Chaikin Volatility", description: "Range expansion indicator", family: "volatility", labels: ["volatility", "breakout", "risk"], expectedEdge: 0.52 },
  { id: "hv", name: "Historical Volatility", description: "Realized return volatility", family: "volatility", labels: ["volatility", "risk", "regime"], expectedEdge: 0.51 },
  { id: "ulcer", name: "Ulcer Index", description: "Drawdown depth volatility", family: "volatility", labels: ["volatility", "drawdown", "risk"], expectedEdge: 0.5 },
  { id: "stddev", name: "StdDev", description: "Standard deviation of price", family: "volatility", labels: ["volatility", "risk", "normalization"], expectedEdge: 0.5 },
  { id: "obv", name: "OBV", description: "On-Balance Volume", family: "volume", labels: ["volume", "trend", "confirmation"], expectedEdge: 0.58 },
  { id: "vwap", name: "VWAP", description: "Volume Weighted Average Price", family: "volume", labels: ["volume", "benchmark", "intraday"], expectedEdge: 0.56 },
  { id: "vwma", name: "VWMA", description: "Volume Weighted Moving Average", family: "volume", labels: ["volume", "moving-average", "trend"], expectedEdge: 0.55 },
  { id: "ad_line", name: "Accumulation/Distribution", description: "Flow pressure line", family: "volume", labels: ["volume", "order-flow", "confirmation"], expectedEdge: 0.56 },
  { id: "cmf", name: "Chaikin Money Flow", description: "Flow intensity oscillator", family: "volume", labels: ["volume", "order-flow", "oscillator"], expectedEdge: 0.57 },
  { id: "eom", name: "Ease of Movement", description: "Price move per volume", family: "volume", labels: ["volume", "momentum", "order-flow"], expectedEdge: 0.53 },
  { id: "fi", name: "Force Index", description: "Price x volume impulse", family: "volume", labels: ["volume", "momentum", "confirmation"], expectedEdge: 0.54 },
  { id: "vp", name: "Volume Profile", description: "Volume by price node map", family: "volume", labels: ["volume", "market-structure", "support-resistance"], expectedEdge: 0.62 },
  { id: "pvt", name: "Price Volume Trend", description: "Cumulative price-volume momentum", family: "volume", labels: ["volume", "momentum", "trend"], expectedEdge: 0.55 },
  { id: "nvi", name: "NVI", description: "Negative Volume Index", family: "volume", labels: ["volume", "regime", "smart-money"], expectedEdge: 0.53 },
  { id: "pvi", name: "PVI", description: "Positive Volume Index", family: "volume", labels: ["volume", "regime", "crowd-flow"], expectedEdge: 0.52 },
  { id: "zscore", name: "Price Z-Score", description: "Deviation from rolling mean", family: "mean_reversion", labels: ["mean-reversion", "statistical", "normalization"], expectedEdge: 0.6 },
  { id: "spread", name: "Spread Divergence", description: "Pair spread deviation", family: "mean_reversion", labels: ["mean-reversion", "pairs", "statistical"], expectedEdge: 0.58 },
  { id: "half_life", name: "Half-Life", description: "Mean-reversion speed estimate", family: "mean_reversion", labels: ["mean-reversion", "statistical", "regime"], expectedEdge: 0.55 },
  { id: "hurst", name: "Hurst Exponent", description: "Trend vs reversion regime", family: "mean_reversion", labels: ["mean-reversion", "trend", "regime"], expectedEdge: 0.54 },
  { id: "boll_revert", name: "Band Reversion", description: "Bollinger mean reversion trigger", family: "mean_reversion", labels: ["mean-reversion", "volatility", "entry"], expectedEdge: 0.59 },
  { id: "pivot", name: "Pivot Points", description: "Session pivot support/resistance", family: "market_structure", labels: ["market-structure", "support-resistance", "intraday"], expectedEdge: 0.55 },
  { id: "market_profile", name: "Market Profile", description: "Value area structure", family: "market_structure", labels: ["market-structure", "volume", "support-resistance"], expectedEdge: 0.6 },
  { id: "sr_zone", name: "Support/Resistance Zones", description: "Structural reaction zones", family: "market_structure", labels: ["market-structure", "support-resistance", "reversal"], expectedEdge: 0.57 },
  { id: "fractal", name: "Fractal Swing", description: "Local high/low structure", family: "market_structure", labels: ["market-structure", "swing", "reversal"], expectedEdge: 0.54 },
  { id: "reg_channel", name: "Regression Channel", description: "Trend and dispersion channel", family: "market_structure", labels: ["market-structure", "trend", "channel"], expectedEdge: 0.56 },
  { id: "fib", name: "Fibonacci Retracement", description: "Retracement reaction levels", family: "market_structure", labels: ["market-structure", "support-resistance", "reversal"], expectedEdge: 0.53 },
  { id: "trend_break", name: "Trendline Break", description: "Line break structural signal", family: "market_structure", labels: ["market-structure", "breakout", "trend"], expectedEdge: 0.57 },
  { id: "range_compress", name: "Range Compression", description: "Low-range squeeze detector", family: "market_structure", labels: ["market-structure", "volatility", "breakout"], expectedEdge: 0.58 },
  { id: "cointegration", name: "Cointegration Score", description: "Long-run equilibrium test", family: "statistical", labels: ["statistical", "pairs", "mean-reversion"], expectedEdge: 0.57 },
  { id: "kalman", name: "Kalman Trend Filter", description: "State-space trend estimate", family: "statistical", labels: ["statistical", "trend", "filter"], expectedEdge: 0.58 },
  { id: "beta_hedge", name: "Beta Hedge Ratio", description: "Dynamic beta neutralization", family: "statistical", labels: ["statistical", "risk", "pairs"], expectedEdge: 0.52 },
  { id: "rolling_corr", name: "Rolling Correlation", description: "Cross-asset correlation regime", family: "statistical", labels: ["statistical", "regime", "portfolio"], expectedEdge: 0.51 },
  { id: "autocorr", name: "Return Autocorrelation", description: "Persistence/anti-persistence check", family: "statistical", labels: ["statistical", "regime", "momentum"], expectedEdge: 0.5 },
  { id: "rolling_sharpe", name: "Rolling Sharpe", description: "Risk-adjusted edge monitor", family: "risk", labels: ["risk", "performance", "stability"], expectedEdge: 0.5 },
  { id: "rolling_sortino", name: "Rolling Sortino", description: "Downside risk-adjusted edge", family: "risk", labels: ["risk", "performance", "drawdown"], expectedEdge: 0.5 },
  { id: "rolling_mdd", name: "Rolling Max Drawdown", description: "Drawdown risk monitor", family: "risk", labels: ["risk", "drawdown", "stability"], expectedEdge: 0.49 },
  { id: "var", name: "Value at Risk", description: "Tail risk estimate", family: "risk", labels: ["risk", "tail-risk", "portfolio"], expectedEdge: 0.49 },
  { id: "expected_shortfall", name: "Expected Shortfall", description: "Conditional tail risk", family: "risk", labels: ["risk", "tail-risk", "portfolio"], expectedEdge: 0.49 },
  { id: "oi_change", name: "Open Interest Change", description: "Positioning pressure proxy", family: "derivatives", labels: ["derivatives", "momentum", "leverage"], expectedEdge: 0.57 },
  { id: "funding_basis", name: "Funding Rate Basis", description: "Perp premium pressure", family: "derivatives", labels: ["derivatives", "mean-reversion", "sentiment"], expectedEdge: 0.58 },
  { id: "ls_ratio", name: "Long/Short Ratio", description: "Crowding sentiment gauge", family: "derivatives", labels: ["derivatives", "sentiment", "contrarian"], expectedEdge: 0.55 },
  { id: "liq_imbalance", name: "Liquidation Imbalance", description: "Forced flow skew proxy", family: "derivatives", labels: ["derivatives", "order-flow", "volatility"], expectedEdge: 0.59 },
  { id: "basis_curve", name: "Basis Curve Slope", description: "Term structure signal", family: "derivatives", labels: ["derivatives", "regime", "sentiment"], expectedEdge: 0.54 },
];

export const INDICATOR_LABELS = Array.from(
  new Set(INDICATOR_CATALOG.flatMap((indicator) => indicator.labels)),
).sort((a, b) => a.localeCompare(b));

export const INDICATOR_FAMILIES: Array<{ value: IndicatorFamily | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "trend", label: "Trend" },
  { value: "momentum", label: "Momentum" },
  { value: "volatility", label: "Volatility" },
  { value: "volume", label: "Volume" },
  { value: "mean_reversion", label: "Mean Reversion" },
  { value: "market_structure", label: "Market Structure" },
  { value: "statistical", label: "Statistical" },
  { value: "risk", label: "Risk" },
  { value: "derivatives", label: "Derivatives" },
];

