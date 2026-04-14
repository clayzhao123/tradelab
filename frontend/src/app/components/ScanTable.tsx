import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { ScanResult } from '../../shared/api/client';

interface ScanTableProps {
  scanResults?: ScanResult[];
}

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
      {Math.round(score)}
    </span>
  );
}

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'LONG') return <TrendingUp size={14} className="text-up" />;
  if (dir === 'SHORT') return <TrendingDown size={14} className="text-down" />;
  return <ArrowRight size={14} className="text-tx-tertiary" />;
}

export function ScanTable({ scanResults = [] }: ScanTableProps) {
  const displayResults = scanResults.map((row) => ({
    symbol: row.symbol.replace("USDT", ""),
    score: row.score * 100,
    dir: row.signal.toUpperCase() as "LONG" | "SHORT" | "NEUTRAL",
    momentum: (row.factors?.momentum ?? 0) * 100,
    volume: (row.factors?.volume ?? 0) * 100,
    volatility: (row.factors?.volatility ?? 0) * 100,
    detail: `${(row.basis ?? []).slice(0, 3).join(" · ")} | 24h ${row.change24hPct.toFixed(2)}% | ${row.lastPrice.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  }));

  return (
    <div className="w-full text-[13px]">
      <div className="flex px-4 py-2 border-b border-border-subtle text-tx-tertiary text-[11px] font-medium uppercase tracking-[0.06em]">
        <div className="w-20">Symbol</div>
        <div className="w-16 text-center">Score</div>
        <div className="w-14 text-center">M</div>
        <div className="w-14 text-center">V</div>
        <div className="w-14 text-center">Vol</div>
        <div className="w-24 text-center">Dir</div>
        <div className="flex-1">Signal Detail</div>
      </div>

      <div className="flex flex-col">
        {displayResults.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-tx-tertiary">
            No scan results yet. Click "Refresh Scan" to fetch live signals.
          </div>
        )}
        {displayResults.map((row, i) => (
          <div
            key={row.symbol}
            className={clsx(
              "flex items-center px-4 py-2.5 transition-colors cursor-pointer hover:bg-hover",
              i % 2 !== 0 ? "bg-border-subtle" : "bg-transparent"
            )}
          >
            <div className="w-20 font-medium text-tx-primary">{row.symbol}</div>
            <div className="w-16 flex justify-center"><ScoreBadge score={row.score} /></div>
            <div className="w-14 text-center font-mono text-[11px] text-tx-secondary">{row.momentum.toFixed(0)}</div>
            <div className="w-14 text-center font-mono text-[11px] text-tx-secondary">{row.volume.toFixed(0)}</div>
            <div className="w-14 text-center font-mono text-[11px] text-tx-secondary">{row.volatility.toFixed(0)}</div>
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
