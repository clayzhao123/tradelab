import { clsx } from 'clsx';
import { AlertTriangle, X } from 'lucide-react';
import { CandlestickChart } from './CandlestickChart';
import { ScanTable } from './ScanTable';
import type { Kline, ScanResult } from '../../shared/api/client';

interface MainAreaProps {
  activeSymbol: string;
  activeTimeframe: string;
  watchlistUpdatedAt: string | null;
  watchlistNextRefreshAt: string | null;
  marketDataProvider: "mock" | "real" | null;
  dashboardRefreshIntervalMs: number;
  riskEvent: string | null;
  onDismissRisk: () => void;
  onSelectTimeframe: (timeframe: string) => void;
  onRunScan: () => Promise<void>;
  klines?: Kline[];
  scanResults?: ScanResult[];
}

const TIMEFRAME_OPTIONS = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1M", label: "1M" },
] as const;

export function MainArea({
  activeSymbol,
  activeTimeframe,
  watchlistUpdatedAt,
  watchlistNextRefreshAt,
  marketDataProvider,
  dashboardRefreshIntervalMs,
  riskEvent,
  onDismissRisk,
  onSelectTimeframe,
  onRunScan,
  klines = [],
  scanResults = [],
}: MainAreaProps) {
  const watchlistMetaText = watchlistUpdatedAt
    ? `Top100 watchlist updated ${new Date(watchlistUpdatedAt).toLocaleString()}`
    : "Top100 watchlist loading...";
  const nextRefreshText = watchlistNextRefreshAt
    ? `next daily refresh ${new Date(watchlistNextRefreshAt).toLocaleString()}`
    : "";
  const marketSourceText = marketDataProvider
    ? `Market source: ${marketDataProvider === "real" ? "REAL" : "MOCK"}`
    : "Market source: loading...";

  return (
    <div className="flex-1 h-full flex flex-col bg-page overflow-hidden">
      {/* Risk Event Banner */}
      {riskEvent && (
        <div className="shrink-0 bg-down-bg border-l-2 border-down px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-down" />
            <span className="text-down text-[13px] font-medium">{riskEvent}</span>
          </div>
          <button
            onClick={onDismissRisk}
            className="text-down hover:opacity-70 transition-opacity p-1 -mr-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Chart Area */}
        <div className="flex-[3] min-h-0 bg-surface border border-border-subtle rounded-md shadow-sm flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-border-subtle flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-[14px] font-medium text-tx-primary flex items-center gap-2">
                {activeSymbol}
                <span className="text-tx-tertiary text-[12px] font-normal">/ USD</span>
              </h2>
            </div>

            {/* Timeframe selector (pill style) */}
            <div className="flex bg-page p-0.5 rounded-sm border border-border-subtle">
              {TIMEFRAME_OPTIONS.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => onSelectTimeframe(tf.value)}
                  className={clsx(
                    "px-2.5 py-0.5 text-[11px] font-medium rounded-[2px] transition-colors",
                    tf.value === activeTimeframe
                      ? "bg-elevated shadow-sm text-tx-primary"
                      : "text-tx-secondary hover:text-tx-primary"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full bg-page relative p-4">
             <CandlestickChart klines={klines} />
          </div>
        </div>

        {/* Scan Results Area */}
        <div className="flex-[2] min-h-0 bg-surface border border-border-subtle rounded-md shadow-sm flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-border-subtle flex items-center justify-between shrink-0">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-tx-tertiary">
              Scan Results
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-tx-tertiary">
                auto refresh {Math.round(dashboardRefreshIntervalMs / 1000)}s
              </span>
              <button
                onClick={() => {
                  void onRunScan();
                }}
                className="text-[11px] text-accent hover:opacity-80 transition-opacity"
              >
                Refresh Scan
              </button>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-border-subtle bg-page/60 text-[10px] text-tx-tertiary">
            <div>{watchlistMetaText}</div>
            <div className="mt-0.5">{nextRefreshText}</div>
            <div className="mt-0.5">{marketSourceText}</div>
            <div className="mt-0.5">Scan basis: momentum + trend + volume regime + volatility penalty + liquidity</div>
          </div>
          <div className="flex-1 overflow-auto">
             <ScanTable scanResults={scanResults} />
          </div>
        </div>
      </div>
    </div>
  );
}
