import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Download, Filter, Search, ShieldAlert } from "lucide-react";
import { useData } from "../contexts/DataContext";
import { toUserErrorMessage, type Order as ApiOrder } from "../../shared/api/client";

type StatusFilter = "all" | "new" | "open" | "partial" | "filled" | "cancelled" | "rejected";

type OrderDraft = {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  limitPrice: number;
};

const STATUS_FILTERS: StatusFilter[] = ["all", "new", "open", "partial", "filled", "cancelled", "rejected"];

function canCancel(order: ApiOrder): boolean {
  return order.status === "new" || order.status === "open" || order.status === "partial";
}

function StatusBadge({ status }: { status: ApiOrder["status"] }) {
  let colorClass = "bg-border-subtle text-tx-tertiary";
  if (status === "new" || status === "open") colorClass = "bg-warning-bg text-warning";
  else if (status === "partial") colorClass = "bg-accent-bg text-accent";
  else if (status === "filled") colorClass = "bg-up-bg text-up";
  else if (status === "cancelled" || status === "rejected") colorClass = "bg-down-bg text-down";

  return (
    <span className={clsx("text-[10px] font-medium px-2 py-1 rounded tracking-wide uppercase", colorClass)}>
      {status}
    </span>
  );
}

export function Orders() {
  const { orders, fills, refreshOrders, placeOrder, cancelOrder } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrderDraft>({
    symbol: "BTCUSDT",
    side: "buy",
    type: "market",
    quantity: 0.01,
    limitPrice: 0,
  });

  const quantityUnit = useMemo(() => {
    const symbol = draft.symbol.trim().toUpperCase();
    if (!symbol) return "base asset";
    return symbol.endsWith("USDT") ? symbol.slice(0, -4) : symbol;
  }, [draft.symbol]);

  const resolvedSymbolFilter = useMemo(() => {
    const normalizedSearch = searchQuery.trim();
    return /^[a-z]{2,10}(usdt)?$/i.test(normalizedSearch) ? normalizedSearch : "";
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshOrders({ status: filterStatus, symbol: resolvedSymbolFilter });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filterStatus, resolvedSymbolFilter, refreshOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toUpperCase();
    return orders.filter((order) => {
      const searchMatch =
        normalizedSearch.length === 0 ||
        order.symbol.includes(normalizedSearch) ||
        order.runId?.toUpperCase().includes(normalizedSearch);
      const statusMatch = filterStatus === "all" || order.status === filterStatus;
      return searchMatch && statusMatch;
    });
  }, [orders, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const filledCount = filteredOrders.filter((order) => order.status === "filled").length;
    const openCount = filteredOrders.filter(
      (order) => order.status === "new" || order.status === "open" || order.status === "partial",
    ).length;
    const totalNotional = fills.reduce((sum, fill) => sum + fill.quantity * fill.price, 0);

    return {
      totalOrders: filteredOrders.length,
      filledCount,
      openCount,
      totalNotional,
    };
  }, [filteredOrders, fills]);

  const handleSubmitOrder = async (): Promise<void> => {
    setErrorMessage(null);

    if (!draft.symbol.trim()) {
      setErrorMessage("Symbol is required");
      return;
    }

    if (!(draft.quantity > 0)) {
      setErrorMessage("Quantity must be greater than 0");
      return;
    }

    if (draft.type === "limit" && !(draft.limitPrice > 0)) {
      setErrorMessage("Limit price must be greater than 0 for limit orders");
      return;
    }

    try {
      setIsSubmitting(true);
      await placeOrder({
        symbol: draft.symbol,
        side: draft.side,
        type: draft.type,
        quantity: draft.quantity,
        limitPrice: draft.type === "limit" ? draft.limitPrice : undefined,
      });
      setDraft((prev) => ({ ...prev, quantity: prev.quantity }));
      await refreshOrders({ status: filterStatus, symbol: resolvedSymbolFilter });
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string): Promise<void> => {
    setErrorMessage(null);
    try {
      setCancelingOrderId(orderId);
      await cancelOrder(orderId);
      await refreshOrders({ status: filterStatus, symbol: resolvedSymbolFilter });
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setCancelingOrderId(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border-subtle bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-medium text-tx-primary mb-1">Orders & Activity</h1>
            <p className="text-[13px] text-tx-secondary">Place/cancel orders and inspect fills in real time.</p>
          </div>
          <button
            onClick={() => {
              void refreshOrders({ status: filterStatus, symbol: resolvedSymbolFilter });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-elevated border border-border-subtle rounded-lg text-[13px] font-medium text-tx-primary hover:bg-hover transition-colors"
          >
            <Download size={14} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Total Orders</div>
            <div className="text-[18px] font-bold font-mono text-tx-primary">{stats.totalOrders}</div>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Filled</div>
            <div className="text-[18px] font-bold font-mono text-up">{stats.filledCount}</div>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Open/New/Partial</div>
            <div className="text-[18px] font-bold font-mono text-warning">{stats.openCount}</div>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-3">
            <div className="text-[11px] text-tx-tertiary mb-1">Filled Notional</div>
            <div className="text-[18px] font-bold font-mono text-tx-primary">
              ${stats.totalNotional.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 bg-elevated border border-border-subtle rounded-lg p-3">
          <input
            value={draft.symbol}
            onChange={(event) => setDraft((prev) => ({ ...prev, symbol: event.target.value.toUpperCase() }))}
            className="col-span-2 px-3 py-2 bg-page border border-border-subtle rounded text-[13px] text-tx-primary"
            placeholder="BTCUSDT"
            title="Trading pair symbol"
          />
          <select
            value={draft.side}
            onChange={(event) => setDraft((prev) => ({ ...prev, side: event.target.value as "buy" | "sell" }))}
            className="col-span-2 px-3 py-2 bg-page border border-border-subtle rounded text-[13px] text-tx-primary"
          >
            <option value="buy">BUY</option>
            <option value="sell">SELL</option>
          </select>
          <select
            value={draft.type}
            onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value as "market" | "limit" }))}
            className="col-span-2 px-3 py-2 bg-page border border-border-subtle rounded text-[13px] text-tx-primary"
          >
            <option value="market">MARKET</option>
            <option value="limit">LIMIT</option>
          </select>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={draft.quantity}
            onChange={(event) => setDraft((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
            className="col-span-2 px-3 py-2 bg-page border border-border-subtle rounded text-[13px] text-tx-primary"
            placeholder="Quantity (e.g. 0.01)"
            title={`Order quantity in ${quantityUnit}`}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={draft.type !== "limit"}
            value={draft.type === "limit" ? draft.limitPrice : ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, limitPrice: Number(event.target.value) }))}
            className="col-span-2 px-3 py-2 bg-page border border-border-subtle rounded text-[13px] text-tx-primary disabled:opacity-40"
            placeholder="Limit"
          />
          <button
            onClick={() => {
              void handleSubmitOrder();
            }}
            disabled={isSubmitting}
            className="col-span-2 px-4 py-2 rounded bg-accent text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Place Order"}
          </button>
          <div className="col-span-12 text-[11px] text-tx-tertiary">
            数量字段代表下单币种数量。当前 `0.01` 表示下单 `0.01 {quantityUnit}`（不是价格）。
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by symbol or runId"
              className="w-full pl-9 pr-3 py-2 bg-elevated border border-border-subtle rounded-lg text-[13px] text-tx-primary placeholder:text-tx-tertiary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-tx-tertiary" />
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-[12px] font-medium transition-colors uppercase",
                  filterStatus === status
                    ? "bg-accent text-white"
                    : "bg-elevated border border-border-subtle text-tx-secondary hover:bg-hover",
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">{errorMessage}</div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
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
              <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Run</th>
              <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b border-border-subtle hover:bg-hover transition-colors">
                <td className="px-6 py-4 text-[13px] font-mono text-tx-tertiary">
                  {new Date(order.requestedAt).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={clsx("text-[12px] font-bold uppercase", order.side === "buy" ? "text-up" : "text-down")}
                  >
                    {order.side}
                  </span>
                </td>
                <td className="px-6 py-4 text-[14px] font-bold text-tx-primary">{order.symbol}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-right text-[13px] font-mono text-tx-secondary">
                  {order.quantity.toFixed(4)}
                </td>
                <td className="px-6 py-4 text-right text-[13px] font-mono text-tx-secondary">
                  {order.filledQuantity.toFixed(4)}
                </td>
                <td className="px-6 py-4 text-right text-[13px] font-mono text-tx-primary">
                  {(order.avgFillPrice ?? order.limitPrice ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 text-[12px] text-tx-tertiary">
                  {order.runId ? `Run ${order.runId.slice(0, 8)}` : "Manual"}
                </td>
                <td className="px-6 py-4 text-right">
                  {canCancel(order) ? (
                    <button
                      onClick={() => {
                        void handleCancelOrder(order.id);
                      }}
                      disabled={cancelingOrderId === order.id}
                      className="px-2.5 py-1 rounded border border-border-subtle text-[11px] text-tx-secondary hover:bg-hover disabled:opacity-50"
                    >
                      {cancelingOrderId === order.id ? "Canceling..." : "Cancel"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-tx-tertiary">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-tx-tertiary">
            <ShieldAlert size={48} className="mb-4 opacity-30" />
            <p className="text-[14px]">No orders found</p>
            <p className="text-[12px] mt-1">Adjust filters or submit a new order</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border-subtle bg-surface">
          <h2 className="text-[12px] uppercase tracking-wider text-tx-tertiary mb-3">Recent Fills</h2>
          <div className="max-h-[220px] overflow-auto rounded border border-border-subtle">
            <table className="w-full">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] text-tx-tertiary uppercase">Time</th>
                  <th className="px-3 py-2 text-left text-[11px] text-tx-tertiary uppercase">Side</th>
                  <th className="px-3 py-2 text-left text-[11px] text-tx-tertiary uppercase">Symbol</th>
                  <th className="px-3 py-2 text-right text-[11px] text-tx-tertiary uppercase">Qty</th>
                  <th className="px-3 py-2 text-right text-[11px] text-tx-tertiary uppercase">Price</th>
                  <th className="px-3 py-2 text-right text-[11px] text-tx-tertiary uppercase">Fee</th>
                </tr>
              </thead>
              <tbody>
                {fills.map((fill) => (
                  <tr key={fill.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2 text-[12px] text-tx-secondary font-mono">
                      {new Date(fill.filledAt).toLocaleTimeString()}
                    </td>
                    <td
                      className={clsx("px-3 py-2 text-[12px] uppercase", fill.side === "buy" ? "text-up" : "text-down")}
                    >
                      {fill.side}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-tx-primary">{fill.symbol}</td>
                    <td className="px-3 py-2 text-[12px] text-right font-mono text-tx-secondary">
                      {fill.quantity.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right font-mono text-tx-primary">
                      {fill.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right font-mono text-tx-secondary">
                      {fill.fee.toFixed(4)}
                    </td>
                  </tr>
                ))}
                {fills.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-[12px] text-tx-tertiary" colSpan={6}>
                      No fills yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
