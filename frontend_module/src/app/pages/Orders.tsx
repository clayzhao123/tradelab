import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ShieldAlert, X, Search, Filter, Download } from 'lucide-react';

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
  session?: string;
}

const MOCK_ORDERS: Order[] = [
  { id: '1', side: 'BUY', symbol: 'BTC', status: 'PARTIAL', time: '14:32:05', qty: 0.12, filled: 0.05, price: 43280.50, pnl: 12.40, session: 'Session #42' },
  { id: '2', side: 'SELL', symbol: 'ETH', status: 'OPEN', time: '14:30:12', qty: 2.5, filled: 0, price: 2350.00, session: 'Session #42' },
  { id: '3', side: 'BUY', symbol: 'SOL', status: 'FILLED', time: '13:45:22', qty: 15, filled: 15, price: 105.20, pnl: -4.50, session: 'Session #42' },
  { id: '4', side: 'SELL', symbol: 'AVAX', status: 'FILLED', time: '12:10:05', qty: 50, filled: 50, price: 34.10, pnl: 45.00, session: 'Session #41' },
  { id: '5', side: 'BUY', symbol: 'LINK', status: 'FILLED', time: '11:22:33', qty: 100, filled: 100, price: 14.20, pnl: 22.50, session: 'Session #41' },
  { id: '6', side: 'SELL', symbol: 'DOT', status: 'CANCELLED', time: '10:05:18', qty: 200, filled: 0, price: 6.85, session: 'Session #41' },
  { id: '7', side: 'BUY', symbol: 'BNB', status: 'FILLED', time: '09:42:08', qty: 5, filled: 5, price: 312.80, pnl: 8.20, session: 'Session #40' },
  { id: '8', side: 'BUY', symbol: 'DOGE', status: 'FILLED', time: '08:15:45', qty: 5000, filled: 5000, price: 0.082, pnl: -12.00, session: 'Session #40' },
];

function StatusBadge({ status }: { status: Order['status'] }) {
  let colorClass = "bg-border-subtle text-tx-tertiary";
  if (status === 'OPEN') colorClass = "bg-warning-bg text-warning";
  else if (status === 'PARTIAL') colorClass = "bg-accent-bg text-accent";
  else if (status === 'FILLED') colorClass = "bg-up-bg text-up";
  else if (status === 'CANCELLED') colorClass = "bg-down-bg text-down";

  return (
    <span className={clsx(
      "text-[10px] font-medium px-2 py-1 rounded tracking-wide",
      colorClass
    )}>
      {status}
    </span>
  );
}

export function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredOrders = MOCK_ORDERS.filter(order => {
    const matchesSearch = order.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.session?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPnL = filteredOrders.reduce((sum, order) => sum + (order.pnl || 0), 0);
  const filledCount = filteredOrders.filter(o => o.status === 'FILLED').length;
  const openCount = filteredOrders.filter(o => o.status === 'OPEN' || o.status === 'PARTIAL').length;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle bg-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[20px] font-medium text-tx-primary mb-1">Orders & Activity</h1>
            <p className="text-[13px] text-tx-secondary">Real-time monitoring of all trading activity and order execution</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-elevated border border-border-subtle rounded-lg text-[13px] font-medium text-tx-primary hover:bg-hover transition-colors">
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Total Orders</div>
            <div className="text-[18px] font-bold font-mono text-tx-primary">{filteredOrders.length}</div>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Filled</div>
            <div className="text-[18px] font-bold font-mono text-up">{filledCount}</div>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Open/Partial</div>
            <div className="text-[18px] font-bold font-mono text-warning">{openCount}</div>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Total P&L</div>
            <div className={clsx(
              "text-[18px] font-bold font-mono",
              totalPnL > 0 ? "text-up" : totalPnL < 0 ? "text-down" : "text-tx-primary"
            )}>
              {totalPnL > 0 ? '+' : ''}{totalPnL < 0 ? '-' : ''}${Math.abs(totalPnL).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symbol or session..."
              className="w-full pl-9 pr-3 py-2 bg-elevated border border-border-subtle rounded-lg text-[13px] text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-tx-tertiary" />
            {['ALL', 'OPEN', 'PARTIAL', 'FILLED', 'CANCELLED'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-[12px] font-medium transition-colors",
                  filterStatus === status
                    ? "bg-accent text-white"
                    : "bg-elevated border border-border-subtle text-tx-secondary hover:bg-hover"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface border-b border-border-subtle z-10">
            <tr>
              <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Time</th>
              <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Side</th>
              <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Symbol</th>
              <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Status</th>
              <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Qty</th>
              <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Filled</th>
              <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Price</th>
              <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">P&L</th>
              <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Session</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border-subtle hover:bg-hover transition-colors"
              >
                <td className="px-6 py-4 text-[13px] font-mono text-tx-tertiary">{order.time}</td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "text-[12px] font-bold",
                    order.side === 'BUY' ? "text-up" : "text-down"
                  )}>
                    {order.side === 'BUY' ? '↑' : '↓'} {order.side}
                  </span>
                </td>
                <td className="px-6 py-4 text-[14px] font-bold text-tx-primary">{order.symbol}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-right text-[13px] font-mono text-tx-secondary">
                  {order.qty.toFixed(3)}
                </td>
                <td className="px-6 py-4 text-right text-[13px] font-mono text-tx-secondary">
                  {order.filled.toFixed(3)}
                </td>
                <td className="px-6 py-4 text-right text-[13px] font-mono text-tx-primary">
                  ${order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                  {order.pnl !== undefined ? (
                    <span className={clsx(
                      "text-[13px] font-mono font-medium",
                      order.pnl > 0 ? "text-up" : order.pnl < 0 ? "text-down" : "text-tx-secondary"
                    )}>
                      {order.pnl > 0 ? '+' : ''}{order.pnl < 0 ? '-' : ''}${Math.abs(order.pnl).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[13px] text-tx-tertiary">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-[12px] text-tx-tertiary">{order.session}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-tx-tertiary">
            <ShieldAlert size={48} className="mb-4 opacity-30" />
            <p className="text-[14px]">No orders found</p>
            <p className="text-[12px] mt-1">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
}
