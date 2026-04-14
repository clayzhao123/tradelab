import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Calendar, Clock, DollarSign, Activity } from 'lucide-react';

const MOCK_HISTORY = [
  { id: '1', strategy: 'RSI-MACD Alpha Matrix', start: '2026-03-29 08:00', end: '2026-03-29 16:30', duration: '8h 30m', trades: 45, pnl: 345.20, status: 'STOPPED' },
  { id: '2', strategy: 'Volatility Breakout V2', start: '2026-03-28 09:15', end: '2026-03-28 11:20', duration: '2h 5m', trades: 12, pnl: -85.40, status: 'LIQUIDATED' },
  { id: '3', strategy: 'Trend Following Pro', start: '2026-03-25 00:00', end: '2026-03-27 23:59', duration: '3d 0h', trades: 128, pnl: 1240.50, status: 'STOPPED' },
  { id: '4', strategy: 'RSI-MACD Alpha Matrix', start: '2026-03-20 14:00', end: '2026-03-21 14:00', duration: '1d 0h', trades: 64, pnl: 210.00, status: 'STOPPED' },
];

export function History() {
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_HISTORY[0].id);

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-[1200px] mx-auto overflow-hidden">
      <div className="mb-6 shrink-0">
        <h1 className="text-[20px] font-medium text-tx-primary mb-1">Session History</h1>
        <p className="text-[13px] text-tx-secondary">Review performance and details of past bot deployments.</p>
      </div>

      <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
        {/* Left: List */}
        <div className="flex-1 bg-surface border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="grid grid-cols-4 px-4 py-3 border-b border-border-subtle text-[11px] font-medium uppercase tracking-wider text-tx-tertiary bg-elevated/50">
            <div className="col-span-2">Session</div>
            <div>Duration</div>
            <div className="text-right">PnL</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {MOCK_HISTORY.map(session => (
              <button
                key={session.id}
                onClick={() => setSelectedId(session.id)}
                className={clsx(
                  "grid grid-cols-4 items-center px-3 py-3 rounded-lg text-left transition-colors border",
                  selectedId === session.id
                    ? "bg-accent-bg border-accent shadow-sm"
                    : "bg-transparent border-transparent hover:bg-hover"
                )}
              >
                <div className="col-span-2 flex flex-col">
                  <span className={clsx("text-[13px] font-medium", selectedId === session.id ? "text-accent" : "text-tx-primary")}>
                    {session.strategy}
                  </span>
                  <span className="text-[11px] text-tx-tertiary font-mono mt-0.5">{session.start}</span>
                </div>
                <div className="text-[12px] text-tx-secondary font-mono">{session.duration}</div>
                <div className={clsx(
                  "text-[13px] font-mono font-medium text-right",
                  session.pnl > 0 ? "text-up" : "text-down"
                )}>
                  {session.pnl > 0 ? '+' : ''}${Math.abs(session.pnl).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Details */}
        <div className="w-[360px] bg-surface border border-border-subtle rounded-xl flex flex-col shadow-sm shrink-0">
          {selectedId ? (
            <SessionDetails session={MOCK_HISTORY.find(s => s.id === selectedId)!} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-tx-tertiary text-[13px]">
              Select a session to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionDetails({ session }: { session: typeof MOCK_HISTORY[0] }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-5">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={clsx(
            "text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider",
            session.status === 'STOPPED' ? "bg-border-subtle text-tx-secondary" : "bg-down-bg text-down"
          )}>
            {session.status}
          </span>
        </div>
        <h2 className="text-[16px] font-medium text-tx-primary mb-1">{session.strategy}</h2>
        <div className="text-[12px] text-tx-tertiary font-mono flex items-center gap-2">
          {session.start} <ArrowRight size={12} /> {session.end}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-elevated border border-border-subtle p-3 rounded-lg flex flex-col">
          <span className="text-[11px] text-tx-tertiary uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign size={12}/> Final PnL</span>
          <span className={clsx("text-[18px] font-mono font-medium", session.pnl > 0 ? "text-up" : "text-down")}>
            {session.pnl > 0 ? '+' : ''}${Math.abs(session.pnl).toFixed(2)}
          </span>
        </div>
        <div className="bg-elevated border border-border-subtle p-3 rounded-lg flex flex-col">
          <span className="text-[11px] text-tx-tertiary uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity size={12}/> Total Trades</span>
          <span className="text-[18px] font-mono font-medium text-tx-primary">
            {session.trades}
          </span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-3">Performance Note</h3>
        <p className="text-[13px] text-tx-secondary leading-relaxed p-3 bg-page border border-border-subtle rounded-lg">
          {session.pnl > 0 
            ? "Bot successfully capitalized on volatility expansions. Risk management parameters held drawdowns within the 2.5% acceptable threshold." 
            : "Market conditions shifted to low-volatility chop. Daily drawdown limit triggered, automatically halting the bot to prevent further capital erosion."}
        </p>
      </div>
      
      <button className="w-full mt-6 py-2.5 bg-elevated border border-border-default hover:border-accent text-[13px] font-medium rounded-lg transition-colors">
        Export Trade Log (CSV)
      </button>
    </div>
  );
}

import { ArrowRight } from 'lucide-react';
