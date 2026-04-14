import React from 'react';

export function CandlestickChart({ symbol }: { symbol: string }) {
  // Generate mock candles
  const candles = React.useMemo(() => {
    let currentPrice = 43000;
    if (symbol === 'ETH') currentPrice = 2300;
    if (symbol === 'SOL') currentPrice = 100;
    if (symbol === 'AVAX') currentPrice = 35;
    
    // Create random walk
    return Array.from({ length: 60 }).map((_, i) => {
      const open = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.005);
      const close = open + (Math.random() - 0.5) * (currentPrice * 0.008);
      const high = Math.max(open, close) + Math.random() * (currentPrice * 0.002);
      const low = Math.min(open, close) - Math.random() * (currentPrice * 0.002);
      currentPrice = close;
      return { open, close, high, low, isUp: close >= open };
    });
  }, [symbol]);

  const minPrice = Math.min(...candles.map(c => c.low));
  const maxPrice = Math.max(...candles.map(c => c.high));
  const range = maxPrice - minPrice || 1;

  // ViewBox dimensions
  const vbWidth = 1000;
  const vbHeight = 300;
  const candleWidth = (vbWidth / candles.length) * 0.6;
  const spacing = vbWidth / candles.length;

  return (
    <div className="w-full h-full relative flex">
      {/* Y-axis grid & labels */}
      <div className="absolute right-0 top-0 bottom-0 w-16 border-l border-border-subtle flex flex-col justify-between items-end text-[10px] font-mono text-tx-tertiary pt-2 pb-6 pr-2">
        <span>{maxPrice.toFixed(2)}</span>
        <span>{(minPrice + range * 0.75).toFixed(2)}</span>
        <span>{(minPrice + range * 0.5).toFixed(2)}</span>
        <span>{(minPrice + range * 0.25).toFixed(2)}</span>
        <span>{minPrice.toFixed(2)}</span>
      </div>

      {/* Grid lines */}
      <div className="absolute left-0 right-16 top-0 bottom-6 flex flex-col justify-between opacity-30 pointer-events-none">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="w-full border-t border-dashed border-border-strong" />
        ))}
      </div>

      {/* Candlesticks SVG */}
      <div className="absolute left-0 right-16 top-0 bottom-6 overflow-hidden">
        <svg viewBox={`0 0 ${vbWidth} ${vbHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {candles.map((c, i) => {
            const xCenter = i * spacing + spacing / 2;
            
            const yHigh = vbHeight - ((c.high - minPrice) / range) * vbHeight;
            const yLow = vbHeight - ((c.low - minPrice) / range) * vbHeight;
            const yOpen = vbHeight - ((c.open - minPrice) / range) * vbHeight;
            const yClose = vbHeight - ((c.close - minPrice) / range) * vbHeight;
            
            const topY = c.isUp ? yClose : yOpen;
            const bottomY = c.isUp ? yOpen : yClose;
            const bodyHeight = Math.max(1, bottomY - topY);
            
            const colorClass = c.isUp ? "var(--base-color-up)" : "var(--base-color-down)";

            return (
              <g key={i}>
                {/* Wick */}
                <line 
                  x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} 
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
        <span>08:00</span>
        <span>09:00</span>
        <span>10:00</span>
        <span>11:00</span>
        <span>12:00</span>
      </div>
    </div>
  );
}
