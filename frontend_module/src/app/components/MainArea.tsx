import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, X } from 'lucide-react';
import { CandlestickChart } from './CandlestickChart';
import { ScanTable } from './ScanTable';

interface MainAreaProps {
  activeSymbol: string;
  riskEvent: string | null;
  onDismissRisk: () => void;
}

export function MainArea({ activeSymbol, riskEvent, onDismissRisk }: MainAreaProps) {
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
              {['1m', '5m', '15m', '1H'].map(tf => (
                <button 
                  key={tf}
                  className={clsx(
                    "px-2.5 py-0.5 text-[11px] font-medium rounded-[2px] transition-colors",
                    tf === '15m' 
                      ? "bg-elevated shadow-sm text-tx-primary" 
                      : "text-tx-secondary hover:text-tx-primary"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 w-full bg-page relative p-4">
             <CandlestickChart symbol={activeSymbol} />
          </div>
        </div>

        {/* Scan Results Area */}
        <div className="flex-[2] min-h-0 bg-surface border border-border-subtle rounded-md shadow-sm flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-border-subtle flex items-center shrink-0">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-tx-tertiary">
              Scan Results
            </h3>
          </div>
          <div className="flex-1 overflow-auto">
             <ScanTable />
          </div>
        </div>
      </div>
    </div>
  );
}
