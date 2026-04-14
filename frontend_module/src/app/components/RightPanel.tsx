import React from 'react';
import { clsx } from 'clsx';
import { ShieldAlert, X } from 'lucide-react';

export interface Order {
  id: string;
  side: 'BUY' | 'SELL';
  symbol: string;
  status: 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED';
  time: string;
  qty: number;
  filled: number;
  price: number;
  pnl?: number;
}

interface RightPanelProps {
  orders: Order[];
}

function StatusBadge({ status }: { status: Order['status'] }) {
  let colorClass = "bg-border-subtle text-tx-tertiary";
  if (status === 'OPEN') colorClass = "bg-warning-bg text-warning";
  else if (status === 'PARTIAL') colorClass = "bg-accent-bg text-accent";
  else if (status === 'FILLED') colorClass = "bg-up-bg text-up";

  return (
    <span className={clsx(
      "text-[10px] font-medium px-1.5 py-0.5 rounded tracking-wide",
      colorClass
    )}>
      {status}
    </span>
  );
}

export function RightPanel({ orders }: RightPanelProps) {
  return (
    <div className="w-[300px] h-full flex flex-col bg-surface border-l border-border-subtle shrink-0">
      <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-tx-tertiary">
          Orders & Activity
        </h3>
        <span className="text-[11px] font-mono text-tx-tertiary bg-border-subtle px-1.5 py-0.5 rounded">
          {orders.length} ACTIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="h-[64px] px-4 flex flex-col justify-center border-b border-border-subtle hover:bg-hover transition-colors group cursor-default"
          >
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "text-[12px] font-bold tracking-wide",
                  order.side === 'BUY' ? "text-up" : "text-down"
                )}>
                  {order.side === 'BUY' ? '↑' : '↓'} {order.side} {order.symbol}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <span className="font-mono text-[11px] text-tx-tertiary">
                {order.time}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <span className="font-mono text-[12px] text-tx-secondary">
                {order.filled.toFixed(3)} / {order.qty.toFixed(3)} <span className="text-tx-tertiary">@</span> {order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {order.pnl !== undefined && (
                <span className={clsx(
                  "font-mono text-[12px] font-medium",
                  order.pnl > 0 ? "text-up" : order.pnl < 0 ? "text-down" : "text-tx-secondary"
                )}>
                  {order.pnl > 0 ? '+' : ''}{order.pnl > 0 ? '$' : order.pnl < 0 ? '-$' : '$'}{Math.abs(order.pnl).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
