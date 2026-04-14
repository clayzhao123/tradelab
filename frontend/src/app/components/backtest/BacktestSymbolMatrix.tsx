import { clsx } from "clsx";
import type { MarketWatchlistItem } from "../../../shared/api/client";
import { formatBacktestSymbol, summarizeSelection } from "./backtestHeatmap";

type BacktestSymbolMatrixProps = {
  items: MarketWatchlistItem[];
  selectedSymbols: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleSymbol: (symbol: string) => void;
  onSelectPreset: (count: number) => void;
  onClear: () => void;
};

export function BacktestSymbolMatrix({
  items,
  selectedSymbols,
  searchQuery,
  onSearchChange,
  onToggleSymbol,
  onSelectPreset,
  onClear,
}: BacktestSymbolMatrixProps) {
  const normalizedQuery = searchQuery.trim().toUpperCase();
  const selectedSet = new Set(selectedSymbols);
  const matchCount = normalizedQuery
    ? items.filter((item) => item.symbol.includes(normalizedQuery)).length
    : items.length;

  return (
    <div className="border border-border-subtle rounded-lg bg-elevated p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <div className="text-[11px] text-tx-tertiary uppercase tracking-wide">Top100 Symbol Matrix</div>
          <div className="text-[13px] text-tx-secondary mt-1">{summarizeSelection(selectedSymbols.length)}. Click any tile to include or exclude it from the run.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onSelectPreset(12)} className="px-2.5 py-1.5 rounded border border-border-default text-[12px] text-tx-primary hover:bg-hover">
            Top 12
          </button>
          <button onClick={() => onSelectPreset(25)} className="px-2.5 py-1.5 rounded border border-border-default text-[12px] text-tx-primary hover:bg-hover">
            Top 25
          </button>
          <button onClick={() => onSelectPreset(100)} className="px-2.5 py-1.5 rounded border border-border-default text-[12px] text-tx-primary hover:bg-hover">
            All 100
          </button>
          <button onClick={onClear} className="px-2.5 py-1.5 rounded border border-border-default text-[12px] text-tx-primary hover:bg-hover">
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search symbols, e.g. BTC"
          className="w-full lg:max-w-[280px] bg-page border border-border-subtle rounded px-3 py-2 text-[12px] text-tx-primary"
        />
        <div className="text-[12px] text-tx-tertiary">
          {normalizedQuery ? `Highlighting ${matchCount} matches for “${normalizedQuery}”` : "Showing all Top100 symbols in fixed rank order"}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="grid grid-cols-5 gap-2 lg:grid-cols-10">
          {Array.from({ length: 100 }, (_, index) => (
            <div key={index} className="h-[54px] rounded-lg border border-border-subtle bg-page/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2 lg:grid-cols-10">
          {items.map((item) => {
            const selected = selectedSet.has(item.symbol);
            const matches = !normalizedQuery || item.symbol.includes(normalizedQuery);
            return (
              <button
                key={item.symbol}
                onClick={() => onToggleSymbol(item.symbol)}
                className={clsx(
                  "h-[54px] rounded-lg border px-2 py-2 text-left transition-all overflow-hidden",
                  selected
                    ? "border-accent bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgba(0,122,90,0.14)]"
                    : "border-border-subtle bg-page text-tx-secondary hover:text-tx-primary hover:border-border-default",
                  !matches && "opacity-30",
                )}
                title={item.symbol}
              >
                <div className="flex h-full flex-col justify-between">
                  <span className="text-[13px] font-semibold leading-none tracking-[0.01em] whitespace-nowrap">
                    {formatBacktestSymbol(item.symbol)}
                  </span>
                  <span className="text-[10px] font-mono text-tx-tertiary">#{item.rank}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
