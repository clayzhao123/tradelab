import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

const MOCK_RESULTS = [
  { symbol: 'BTC', score: 85, dir: 'LONG', detail: 'Breakout above 20-period high + RSI 62' },
  { symbol: 'ETH', score: 72, dir: 'LONG', detail: 'MA Spread widening, Pullback confirmed' },
  { symbol: 'SOL', score: 65, dir: 'NEUTRAL', detail: 'Consolidating near support' },
  { symbol: 'DOGE', score: 42, dir: 'SHORT', detail: 'Trend weakening, RSI overbought (82)' },
  { symbol: 'AVAX', score: 88, dir: 'LONG', detail: 'Strong activity + Breakout' },
];

function ScoreBadge({ score }: { score: number }) {
  let type = 'low';
  if (score >= 70) type = 'high';
  else if (score >= 50) type = 'mid';

  return (
    <span className={clsx(
      "font-mono text-[11px] font-medium px-1.5 py-0.5 rounded",
      type === 'high' && "bg-up-bg text-up",
      type === 'mid' && "bg-accent-bg text-accent",
      type === 'low' && "bg-border-subtle text-tx-tertiary"
    )}>
      {score}
    </span>
  );
}

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'LONG') return <TrendingUp size={14} className="text-up" />;
  if (dir === 'SHORT') return <TrendingDown size={14} className="text-down" />;
  return <ArrowRight size={14} className="text-tx-tertiary" />;
}

export function ScanTable() {
  return (
    <div className="w-full text-[13px]">
      <div className="flex px-4 py-2 border-b border-border-subtle text-tx-tertiary text-[11px] font-medium uppercase tracking-[0.06em]">
        <div className="w-20">Symbol</div>
        <div className="w-20 text-center">Score</div>
        <div className="w-24 text-center">Direction</div>
        <div className="flex-1">Signal Detail</div>
      </div>
      
      <div className="flex flex-col">
        {MOCK_RESULTS.map((row, i) => (
          <div 
            key={row.symbol} 
            className={clsx(
              "flex items-center px-4 py-2.5 transition-colors cursor-pointer hover:bg-hover",
              i % 2 !== 0 ? "bg-border-subtle" : "bg-transparent"
            )}
          >
            <div className="w-20 font-medium text-tx-primary">{row.symbol}</div>
            <div className="w-20 flex justify-center"><ScoreBadge score={row.score} /></div>
            <div className="w-24 flex items-center justify-center gap-1.5">
              <DirIcon dir={row.dir} />
              <span className={clsx(
                "text-[11px] font-medium",
                row.dir === 'LONG' ? "text-up" : row.dir === 'SHORT' ? "text-down" : "text-tx-tertiary"
              )}>
                {row.dir}
              </span>
            </div>
            <div className="flex-1 text-tx-secondary truncate">{row.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
