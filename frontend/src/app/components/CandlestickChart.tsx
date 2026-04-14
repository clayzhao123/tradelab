import React from 'react';
import type { Kline } from '../../shared/api/client';

interface CandlestickChartProps {
  klines?: Kline[];
}

export function CandlestickChart({ klines = [] }: CandlestickChartProps) {
  const candles = React.useMemo(
    () =>
      [...klines]
        .sort((a, b) => a.openTime.localeCompare(b.openTime))
        .map((kline) => ({
          open: kline.open,
          close: kline.close,
          high: kline.high,
          low: kline.low,
          openTime: kline.openTime,
          closeTime: kline.closeTime,
          timeframe: kline.timeframe,
          isUp: kline.close >= kline.open,
        })),
    [klines],
  );

  if (candles.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-tx-tertiary text-[13px]">
        No chart data available
      </div>
    );
  }

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const range = Math.max(1e-9, maxPrice - minPrice);

  const vbWidth = 1100;
  const vbHeight = 360;
  const chartPadding = {
    top: 12,
    right: 8,
    bottom: 26,
    left: 8,
  };
  const plotWidth = vbWidth - chartPadding.left - chartPadding.right;
  const plotHeight = vbHeight - chartPadding.top - chartPadding.bottom;
  const spacing = plotWidth / candles.length;
  const candleWidth = Math.max(2, Math.min(18, spacing * 0.7));
  const timeframe = candles[candles.length - 1]?.timeframe ?? "15m";

  const toY = (price: number): number =>
    chartPadding.top + ((maxPrice - price) / range) * plotHeight;

  const labelCount = Math.min(6, candles.length);
  const xTicks = Array.from({ length: labelCount }, (_, index) => {
    const candleIndex =
      labelCount === 1
        ? candles.length - 1
        : Math.round((index * (candles.length - 1)) / (labelCount - 1));
    const candle = candles[candleIndex];
    const date = new Date(candle.closeTime);
    const label =
      timeframe.includes("d") || timeframe.includes("w") || timeframe.includes("M") || timeframe.includes("y")
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return {
      index: candleIndex,
      label,
    };
  });

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const ratio = i / 4;
    return Number((maxPrice - range * ratio).toFixed(maxPrice > 1000 ? 2 : 4));
  });

  return (
    <div className="w-full h-full relative flex">
      {/* Y-axis grid & labels */}
      <div className="absolute right-0 top-0 bottom-0 w-16 border-l border-border-subtle flex flex-col justify-between items-end text-[10px] font-mono text-tx-tertiary pt-2 pb-6 pr-2">
        {yTicks.map((tick) => (
          <span key={tick}>{tick.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        ))}
      </div>

      {/* Grid lines */}
      <div className="absolute left-0 right-16 top-0 bottom-6 flex flex-col justify-between opacity-30 pointer-events-none">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full border-t border-dashed border-border-strong" />
        ))}
      </div>

      {/* Candlesticks SVG */}
      <div className="absolute left-0 right-16 top-0 bottom-6 overflow-hidden">
        <svg viewBox={`0 0 ${vbWidth} ${vbHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {candles.map((c, i) => {
            const xCenter = chartPadding.left + i * spacing + spacing / 2;
            const yHigh = toY(c.high);
            const yLow = toY(c.low);
            const yOpen = toY(c.open);
            const yClose = toY(c.close);

            const topY = c.isUp ? yClose : yOpen;
            const bottomY = c.isUp ? yOpen : yClose;
            const bodyHeight = Math.max(1, bottomY - topY);

            const colorClass = c.isUp ? "var(--base-color-up)" : "var(--base-color-down)";

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={xCenter}
                  y1={yHigh}
                  x2={xCenter}
                  y2={yLow}
                  stroke={colorClass}
                  strokeWidth={2}
                  opacity="0.6"
                />
                {/* Body */}
                <rect
                  x={xCenter - candleWidth / 2}
                  y={topY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={colorClass}
                  rx="2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-0 right-16 bottom-0 h-6 flex justify-between items-end text-[10px] font-mono text-tx-tertiary px-2 pb-1">
        {xTicks.map((tick) => (
          <span key={`${tick.index}-${tick.label}`}>{tick.label}</span>
        ))}
      </div>
    </div>
  );
}
