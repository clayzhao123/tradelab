import { useEffect, useState } from "react";
import { ResponsiveContainer, Treemap } from "recharts";
import { clsx } from "clsx";
import type { BacktestTreemapNode, HeatmapMetric, HeatmapVisibilitySummary } from "./backtestHeatmap";
import {
  formatMetricValue,
  formatBacktestSymbol,
  getHeatmapFill,
  getHeatmapMetricConfig,
  getHeatmapStroke,
  getHeatmapTextColor,
  getMetricValue,
} from "./backtestHeatmap";

type BacktestTreemapProps = {
  data: BacktestTreemapNode[];
  activeSymbol: string | null;
  onActivate: (node: BacktestTreemapNode) => void;
  generatedAt: string;
  timeframe: string;
  lookbackBars: number;
  colorMetric: HeatmapMetric;
  onColorMetricChange: (metric: HeatmapMetric) => void;
  visibilitySummary: HeatmapVisibilitySummary;
};

type TreemapContentProps = {
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: BacktestTreemapNode;
  root?: { children?: BacktestTreemapNode[] };
};

function CustomTreemapContent({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  index = 0,
  payload,
  root,
  depth = 0,
  activeSymbol,
  focusPulse,
  onActivate,
  colorMetric,
}: TreemapContentProps & {
  activeSymbol: string | null;
  focusPulse: number;
  onActivate: (node: BacktestTreemapNode) => void;
  colorMetric: HeatmapMetric;
}) {
  if (depth !== 1) {
    return null;
  }

  const node = payload ?? root?.children?.[index];
  if (!node || width <= 0 || height <= 0) {
    return null;
  }

  const isActive = activeSymbol === node.symbol;
  const fill = getHeatmapFill(node, colorMetric);
  const stroke = getHeatmapStroke(isActive);
  const textColor = getHeatmapTextColor(node, colorMetric);
  const metricValue = formatMetricValue(colorMetric, getMetricValue(node, colorMetric));
  const showMetric = width > 72 && height > 34;
  const showRank = width > 42 && height > 20;
  const showFooter = width > 104 && height > 62;

  return (
    <g
      onMouseEnter={() => onActivate(node)}
      onMouseMove={() => onActivate(node)}
      onClick={() => onActivate(node)}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={isActive ? 1.5 : 0.45}
      />
      {isActive && width > 2 && height > 2 ? (
        <rect
          key={focusPulse}
          x={x + 0.5}
          y={y + 0.5}
          width={Math.max(0, width - 1)}
          height={Math.max(0, height - 1)}
          fill="none"
          stroke="var(--base-color-accent)"
          className="backtest-treemap-focus-ring"
          pointerEvents="none"
        />
      ) : null}
      <text x={x + 6} y={y + 18} fill={textColor} fontSize={width > 110 ? 18 : 11} fontWeight={700}>
        {node.shortSymbol}
      </text>
      {showRank ? (
        <text x={x + width - 6} y={y + 18} fill="rgba(22,21,19,0.56)" fontSize={10} textAnchor="end">
          #{node.rank}
        </text>
      ) : null}
      {showMetric ? (
        <text x={x + 6} y={y + (width > 110 ? 42 : 32)} fill={textColor} fontSize={width > 110 ? 13 : 10} fontWeight={600}>
          {metricValue}
        </text>
      ) : null}
      {showFooter ? (
        <text x={x + 6} y={y + height - 8} fill="rgba(22,21,19,0.6)" fontSize={10}>
          Ret {node.totalReturnPct >= 0 ? "+" : ""}{node.totalReturnPct.toFixed(1)}% · Sharpe {node.sharpe.toFixed(2)}
        </text>
      ) : null}
    </g>
  );
}

const METRIC_OPTIONS: Array<{ value: HeatmapMetric; label: string }> = [
  { value: "return", label: "Return" },
  { value: "stability", label: "Stability" },
  { value: "sharpe", label: "Sharpe" },
];

export function BacktestTreemap({
  data,
  activeSymbol,
  onActivate,
  generatedAt,
  timeframe,
  lookbackBars,
  colorMetric,
  onColorMetricChange,
  visibilitySummary,
}: BacktestTreemapProps) {
  const metricConfig = getHeatmapMetricConfig(colorMetric);
  const [focusPulse, setFocusPulse] = useState(0);

  useEffect(() => {
    if (activeSymbol) {
      setFocusPulse((value) => value + 1);
    }
  }, [activeSymbol]);

  return (
    <div className="bg-surface border border-border-subtle rounded-[28px] p-5 shadow-sm">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-tx-tertiary">Symbol Heatmap</h3>
            <p className="text-[15px] text-tx-primary mt-1">Treemap view of the latest backtest universe</p>
            <p className="text-[13px] text-tx-secondary mt-1">Block size follows watchlist market-cap weight. {metricConfig.description}</p>
          </div>
          <div className="text-[12px] text-tx-tertiary xl:text-right">
            <div>Generated {new Date(generatedAt).toLocaleString()}</div>
            <div>Timeframe {timeframe.toUpperCase()} · Lookback {lookbackBars} bars</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-page/55 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onColorMetricChange(option.value)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors border",
                  colorMetric === option.value
                    ? "border-tx-primary bg-tx-primary text-page"
                    : "border-border-default bg-elevated text-tx-secondary hover:text-tx-primary hover:bg-hover",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-tx-tertiary">
            <div className="font-medium uppercase tracking-wide">{metricConfig.label} scale</div>
            <div>{metricConfig.negativeLabel}</div>
            <div className="h-[10px] w-[168px] rounded-full bg-[linear-gradient(90deg,#de7488_0%,#f1f0eb_50%,#93c572_100%)]" />
            <div>{metricConfig.positiveLabel}</div>
            <div className="rounded-full bg-elevated px-2 py-1 border border-border-subtle">mid {metricConfig.midpointLabel}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-page/45 px-4 py-3 text-[12px] text-tx-secondary flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
          <div>
            Showing {visibilitySummary.visibleCount} of {visibilitySummary.universeCount} symbols in the heatmap.
            Returns with absolute move below {visibilitySummary.thresholdPct.toFixed(2)}% are hidden unless they are in the top 10 by magnitude.
          </div>
          <div className={clsx(activeSymbol ? "text-tx-primary" : "text-tx-tertiary")}>
            {activeSymbol ? `Focused: ${formatBacktestSymbol(activeSymbol)}` : `${visibilitySummary.hiddenCount} symbols hidden from the heatmap`}
          </div>
        </div>
      </div>

      <div className="h-[420px] w-full overflow-hidden rounded-[24px] border border-border-subtle bg-page/40">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={1.72}
            stroke="rgba(60, 58, 52, 0.18)"
            isAnimationActive={false}
            content={
              <CustomTreemapContent
                activeSymbol={activeSymbol}
                focusPulse={focusPulse}
                onActivate={onActivate}
                colorMetric={colorMetric}
              />
            }
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
