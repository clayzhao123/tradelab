import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { ComposedChart, ReferenceDot, ReferenceLine } from "recharts";
import type { BacktestTreemapNode } from "./backtestHeatmap";

type BacktestTreemapDetailCardProps = {
  node: BacktestTreemapNode | null;
};

type PriceChartPoint = {
  index: number;
  ts: string;
  label: string;
  price: number;
};

type ChartTradeMarker = {
  markerId: number;
  tradeIndex: number;
  action: "buy" | "sell";
  ts: string;
  price: number;
  index: number;
  linkedMarkerId: number | null;
  linkedTs: string | null;
  linkedPrice: number | null;
  linkedIndex: number | null;
};

type HighlightedTradeLink = {
  buyMarkerId: number;
  buyIndex: number;
  buyPrice: number;
  buyTs: string;
  sellMarkerId: number;
  sellIndex: number;
  sellPrice: number;
  sellTs: string;
  tradeIndex: number;
};

type TradeListEntry = HighlightedTradeLink & {
  returnPct: number;
  pnl: "profit" | "loss";
  durationLabel: string;
  summaryLabel: string;
};

const formatAxisDate = (ts: string): string => {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatTooltipDate = (ts: string): string => {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatTradeListDate = (ts: string): string => {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(value) >= 1) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
};

const formatDuration = (startTs: string, endTs: string): string => {
  const start = new Date(startTs).getTime();
  const end = new Date(endTs).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "-";
  }

  let remainingMinutes = Math.max(1, Math.round((end - start) / 60000));
  const days = Math.floor(remainingMinutes / (60 * 24));
  remainingMinutes -= days * 60 * 24;
  const hours = Math.floor(remainingMinutes / 60);
  remainingMinutes -= hours * 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (remainingMinutes > 0 && parts.length < 2) parts.push(`${remainingMinutes}m`);
  return parts.join(" ") || "0m";
};

function TradeListColumn({
  title,
  emptyText,
  items,
  activeTradeKey,
  onSelect,
}: {
  title: string;
  emptyText: string;
  items: TradeListEntry[];
  activeTradeKey: number | null;
  onSelect: (trade: TradeListEntry) => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-page/38 p-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-tx-tertiary">{title}</div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle bg-page/45 px-3 py-6 text-center text-[12px] text-tx-tertiary">
          {emptyText}
        </div>
      ) : (
        <div className="max-h-[228px] space-y-2 overflow-y-auto pr-1">
          {items.map((trade) => {
            const tradeKey = trade.buyMarkerId;
            const isActive = activeTradeKey === tradeKey;
            return (
              <button
                key={tradeKey}
                type="button"
                onClick={() => onSelect(trade)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "border-accent bg-accent/12 text-tx-primary"
                    : "border-border-subtle bg-elevated text-tx-secondary hover:border-border-default hover:text-tx-primary"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-medium">Trade #{trade.tradeIndex}</div>
                  <div className={`text-[12px] font-mono ${trade.returnPct >= 0 ? "text-up" : "text-down"}`}>
                    {trade.returnPct >= 0 ? "+" : ""}
                    {trade.returnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-tx-tertiary">{trade.summaryLabel}</div>
                <div className="mt-1 text-[11px] text-tx-tertiary">Hold {trade.durationLabel}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BacktestTreemapDetailCard({ node }: BacktestTreemapDetailCardProps) {
  const [selectedTradeState, setSelectedTradeState] = useState<{ symbol: string | null; buyMarkerId: number | null }>({
    symbol: null,
    buyMarkerId: null,
  });
  const selectedBuyMarkerId = selectedTradeState.symbol === (node?.symbol ?? null) ? selectedTradeState.buyMarkerId : null;

  useEffect(() => {
    setSelectedTradeState({ symbol: null, buyMarkerId: null });
  }, [node?.symbol]);

  const priceHistoryState = useMemo(() => {
    if (!node) {
      return {
        chartData: [] as PriceChartPoint[],
        tradeList: [] as TradeListEntry[],
        profitableTrades: [] as TradeListEntry[],
        losingTrades: [] as TradeListEntry[],
      };
    }

    const indexByTs = new Map(node.priceCurve.map((point, index) => [point.ts, index]));
    const chartData: PriceChartPoint[] = node.priceCurve.map((point, index) => ({
      index,
      ts: point.ts,
      label: formatAxisDate(point.ts),
      price: point.price,
    }));
    const markersById = new Map<number, ChartTradeMarker>();
    for (const marker of node.tradeMarkers) {
      const index = indexByTs.get(marker.ts);
      if (index == null) {
        continue;
      }

      const chartMarker: ChartTradeMarker = {
        markerId: marker.markerId,
        tradeIndex: marker.tradeIndex,
        action: marker.action,
        ts: marker.ts,
        price: marker.price,
        index,
        linkedMarkerId: marker.linkedMarkerId,
        linkedTs: marker.linkedTs,
        linkedPrice: marker.linkedPrice,
        linkedIndex: marker.linkedTs ? (indexByTs.get(marker.linkedTs) ?? null) : null,
      };

      markersById.set(chartMarker.markerId, chartMarker);
    }

    const tradeList: TradeListEntry[] = [];
    for (const marker of markersById.values()) {
      if (marker.action !== "buy" || marker.linkedMarkerId == null || marker.linkedIndex == null || marker.linkedPrice == null || !marker.linkedTs) {
        continue;
      }

      const returnPct = ((marker.linkedPrice - marker.price) / Math.max(marker.price, 1e-9)) * 100;
      tradeList.push({
        buyMarkerId: marker.markerId,
        buyIndex: marker.index,
        buyPrice: marker.price,
        buyTs: marker.ts,
        sellMarkerId: marker.linkedMarkerId,
        sellIndex: marker.linkedIndex,
        sellPrice: marker.linkedPrice,
        sellTs: marker.linkedTs,
        tradeIndex: marker.tradeIndex,
        returnPct: Number(returnPct.toFixed(2)),
        pnl: returnPct >= 0 ? "profit" : "loss",
        durationLabel: formatDuration(marker.ts, marker.linkedTs),
        summaryLabel: `${formatTradeListDate(marker.ts)} -> ${formatTradeListDate(marker.linkedTs)} · ${formatPrice(marker.price)} -> ${formatPrice(marker.linkedPrice)}`,
      });
    }

    const profitableTrades = [...tradeList].filter((trade) => trade.returnPct >= 0).sort((a, b) => b.returnPct - a.returnPct);
    const losingTrades = [...tradeList].filter((trade) => trade.returnPct < 0).sort((a, b) => a.returnPct - b.returnPct);

    return { chartData, tradeList, profitableTrades, losingTrades };
  }, [node]);

  const selectedTrade = useMemo<TradeListEntry | null>(
    () => priceHistoryState.tradeList.find((trade) => trade.buyMarkerId === selectedBuyMarkerId) ?? null,
    [priceHistoryState.tradeList, selectedBuyMarkerId],
  );

  const durationLabelPosition = selectedTrade
    ? {
        x: (selectedTrade.buyIndex + selectedTrade.sellIndex) / 2,
        y: Math.min(selectedTrade.buyPrice, selectedTrade.sellPrice),
      }
    : null;

  const handleSelectTrade = (trade: TradeListEntry): void => {
    setSelectedTradeState({
      symbol: node?.symbol ?? null,
      buyMarkerId: trade.buyMarkerId,
    });
  };

  return (
    <div className="bg-elevated border border-border-subtle rounded-xl p-4 min-h-[760px]">
      <div className="text-[11px] text-tx-tertiary uppercase tracking-wide mb-3">Focused Symbol Detail</div>
      {!node ? (
        <div className="h-[660px] flex items-center justify-center text-center text-[13px] text-tx-tertiary rounded-lg border border-dashed border-border-subtle bg-page/40 px-6">
          Hover or tap a treemap block to inspect the symbol's full price history, then click a trade below the chart to reveal its buy and sell points.
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-[20px] font-medium text-tx-primary">{node.shortSymbol}</h4>
              <div className="text-[12px] text-tx-tertiary mt-1">
                Rank #{node.rank} · Trades {node.trades} · Stability {node.stabilityScore.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[18px] font-mono font-medium ${node.totalReturnPct >= 0 ? "text-up" : "text-down"}`}>
                {node.totalReturnPct >= 0 ? "+" : ""}
                {node.totalReturnPct.toFixed(2)}%
              </div>
              <div className="text-[12px] text-tx-tertiary">total return</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-[12px]">
            <div className="rounded-lg border border-border-subtle bg-page/45 p-3">
              <div className="text-tx-tertiary">Max drawdown</div>
              <div className="mt-1 font-mono text-tx-primary">{node.maxDrawdownPct.toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-page/45 p-3">
              <div className="text-tx-tertiary">Sharpe</div>
              <div className="mt-1 font-mono text-tx-primary">{node.sharpe.toFixed(3)}</div>
            </div>
          </div>

          {priceHistoryState.chartData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-center text-[13px] text-tx-tertiary rounded-lg border border-dashed border-border-subtle bg-page/40 px-6 mb-4">
              No price history is available for this symbol in the current backtest window.
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex flex-col gap-1 mb-2">
                <div className="text-[12px] font-medium text-tx-primary">Whole-window price path</div>
                <div className="text-[11px] text-tx-tertiary">
                  {selectedTrade
                    ? `Trade #${selectedTrade.tradeIndex}: buy ${formatPrice(selectedTrade.buyPrice)} on ${formatTooltipDate(selectedTrade.buyTs)}, sell ${formatPrice(selectedTrade.sellPrice)} on ${formatTooltipDate(selectedTrade.sellTs)}, hold ${selectedTrade.durationLabel}.`
                    : priceHistoryState.tradeList.length > 0
                      ? "Select a trade from the lists below to reveal its buy point, sell point, arrow path, and holding duration."
                      : "No paired buy/sell trades were triggered for this symbol in the current window."}
                </div>
              </div>

              <div
                key={node.symbol}
                className="h-[260px] w-full animate-in fade-in zoom-in-95 duration-300"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={priceHistoryState.chartData} margin={{ top: 8, right: 12, left: -10, bottom: 2 }}>
                    <CartesianGrid stroke="rgba(60, 58, 52, 0.08)" vertical={false} />
                    <XAxis
                      type="number"
                      dataKey="index"
                      domain={[0, Math.max(0, priceHistoryState.chartData.length - 1)]}
                      tickCount={6}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--base-text-secondary)" }}
                      tickFormatter={(value: number) => priceHistoryState.chartData[Math.round(value)]?.label ?? ""}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--base-text-secondary)" }}
                      tickFormatter={(value: number) => formatPrice(value)}
                      width={64}
                    />
                    <Tooltip
                      formatter={(value: unknown, name: string | number | undefined) => {
                        const numericValue = Number(Array.isArray(value) ? value[0] : value ?? 0);
                        const seriesName = String(name ?? "");
                        if (seriesName === "Price") {
                          return [formatPrice(numericValue), "Price"] as [string, string];
                        }
                        return [formatPrice(numericValue), seriesName === "Buy" ? "Buy point" : "Sell point"] as [string, string];
                      }}
                      labelFormatter={(value: unknown) => {
                        const index = Math.max(0, Math.round(Number(value ?? 0)));
                        const point = priceHistoryState.chartData[index];
                        return point ? formatTooltipDate(point.ts) : `Bar ${String(value ?? "")}`;
                      }}
                      contentStyle={{
                        backgroundColor: "var(--base-bg-elevated)",
                        border: "1px solid var(--base-border-default)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      name="Price"
                      stroke="#3d74d6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={true}
                      animationDuration={420}
                    />
                    {selectedTrade ? (
                      <>
                        <ReferenceLine
                          segment={[
                            { x: selectedTrade.buyIndex, y: selectedTrade.buyPrice },
                            { x: selectedTrade.sellIndex, y: selectedTrade.sellPrice },
                          ]}
                          stroke="#b84b63"
                          strokeWidth={2}
                          ifOverflow="extendDomain"
                        />
                        <ReferenceDot
                          x={selectedTrade.sellIndex}
                          y={selectedTrade.sellPrice}
                          r={8}
                          fill="#b84b63"
                          stroke="#fffdf7"
                          strokeWidth={2}
                          ifOverflow="extendDomain"
                          label={{ value: "Exit ->", position: "top", fill: "#b84b63", fontSize: 11 }}
                        />
                        <ReferenceDot
                          x={selectedTrade.buyIndex}
                          y={selectedTrade.buyPrice}
                          r={8}
                          fill="#1a7a52"
                          stroke="#fffdf7"
                          strokeWidth={2}
                          ifOverflow="extendDomain"
                          label={{ value: "Buy", position: "top", fill: "#1a7a52", fontSize: 11 }}
                        />
                        {durationLabelPosition ? (
                          <ReferenceDot
                            x={durationLabelPosition.x}
                            y={durationLabelPosition.y}
                            r={0}
                            fill="transparent"
                            stroke="transparent"
                            ifOverflow="extendDomain"
                            label={{ value: selectedTrade.durationLabel, position: "bottom", fill: "var(--base-text-secondary)", fontSize: 11 }}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 mb-4 xl:grid-cols-2">
            <TradeListColumn
              title="Profitable Trades"
              emptyText="No profitable round trips in this window."
              items={priceHistoryState.profitableTrades}
              activeTradeKey={selectedTrade?.buyMarkerId ?? null}
              onSelect={handleSelectTrade}
            />
            <TradeListColumn
              title="Losing Trades"
              emptyText="No losing round trips in this window."
              items={priceHistoryState.losingTrades}
              activeTradeKey={selectedTrade?.buyMarkerId ?? null}
              onSelect={handleSelectTrade}
            />
          </div>

          {node.tradeReturnCurve.length === 0 ? (
            <div className="h-[188px] flex items-center justify-center text-center text-[13px] text-tx-tertiary rounded-lg border border-dashed border-border-subtle bg-page/40 px-6">
              No trades triggered for this symbol in the current backtest window.
            </div>
          ) : (
            <div>
              <div className="text-[12px] font-medium text-tx-primary mb-2">Trade-by-trade return path</div>
              <div className="h-[188px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={node.tradeReturnCurve} margin={{ top: 8, right: 10, left: -16, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(60, 58, 52, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="tradeIndex"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--base-text-secondary)" }}
                      label={{ value: "Trade count", position: "insideBottom", offset: -4, fill: "var(--base-text-secondary)", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--base-text-secondary)" }}
                      tickFormatter={(value: number) => `${value}%`}
                      label={{ value: "Return %", angle: -90, position: "insideLeft", fill: "var(--base-text-secondary)", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: unknown) => [`${Number(Array.isArray(value) ? value[0] : value ?? 0).toFixed(2)}%`, "Return"] as [string, string]}
                      labelFormatter={(value: unknown) => `Trade ${String(value ?? "")}`}
                      contentStyle={{
                        backgroundColor: "var(--base-bg-elevated)",
                        border: "1px solid var(--base-border-default)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="returnPct"
                      stroke={node.totalReturnPct >= 0 ? "#1a7a52" : "#b84b63"}
                      strokeWidth={2.2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


