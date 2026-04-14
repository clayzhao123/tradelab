import type { ReactNode } from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { BacktestResult } from "../../../shared/api/client";
import { PanelInfoButton } from "../common/PanelInfoButton";
import {
  summarizeBenchmark,
  summarizeDistribution,
  summarizeDrawdowns,
  summarizeExposure,
  summarizeTradeStats,
} from "./backtestInsights";

type BacktestInsightsGridProps = {
  result: BacktestResult;
};

function InsightPanel({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">{title}</div>
        <PanelInfoButton label={help} />
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "up" | "down" }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-tx-tertiary">{label}</span>
      <span className={tone === "up" ? "font-mono text-up" : tone === "down" ? "font-mono text-down" : "font-mono text-tx-primary"}>
        {value}
      </span>
    </div>
  );
}

export function BacktestInsightsGrid({ result }: BacktestInsightsGridProps) {
  const tradeStats = summarizeTradeStats(result);
  const drawdowns = summarizeDrawdowns(result);
  const distribution = summarizeDistribution(result);
  const benchmark = summarizeBenchmark(result);
  const exposure = summarizeExposure(result);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <InsightPanel
        title="Trade Stats"
        help="Shows how the strategy behaves trade by trade, including true trade win rate, payoff quality, expectancy, and holding duration."
      >
        <div className="space-y-2">
          <MetricRow label="Total trades" value={String(tradeStats.totalTrades)} />
          <MetricRow label="Trade win rate" value={`${tradeStats.winRatePct.toFixed(2)}%`} tone={tradeStats.winRatePct >= 50 ? "up" : "down"} />
          <MetricRow label="Avg win / loss" value={`${tradeStats.avgWinPct.toFixed(2)}% / ${tradeStats.avgLossPct.toFixed(2)}%`} />
          <MetricRow label="Payoff ratio" value={tradeStats.payoffRatio.toFixed(2)} tone={tradeStats.payoffRatio >= 1 ? "up" : "down"} />
          <MetricRow label="Expectancy" value={`${tradeStats.expectancyPct >= 0 ? "+" : ""}${tradeStats.expectancyPct.toFixed(2)}%`} tone={tradeStats.expectancyPct >= 0 ? "up" : "down"} />
          <MetricRow label="Avg hold" value={tradeStats.avgHoldLabel} />
          <MetricRow label="Longest win / loss streak" value={`${tradeStats.longestWinStreak} / ${tradeStats.longestLossStreak}`} />
        </div>
      </InsightPanel>

      <InsightPanel
        title="Drawdown Diagnostics"
        help="Shows how painful the bad periods were: underwater curve, current drawdown, recovery factor, and the deepest drawdown episodes."
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <MetricRow label="Current DD" value={`${drawdowns.currentDrawdownPct.toFixed(2)}%`} tone="down" />
          <MetricRow label="Recovery factor" value={drawdowns.recoveryFactor.toFixed(2)} tone={drawdowns.recoveryFactor >= 1 ? "up" : "down"} />
        </div>
        <div className="h-[150px] mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={drawdowns.underwaterCurve}>
              <CartesianGrid stroke="rgba(60, 58, 52, 0.08)" vertical={false} />
              <XAxis dataKey="index" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(2)}%`, "Drawdown"] as [string, string]}
                labelFormatter={(value: unknown) => {
                  const point = drawdowns.underwaterCurve[Math.round(Number(value ?? 0))];
                  return point ? new Date(point.ts).toLocaleDateString() : "";
                }}
                contentStyle={{
                  backgroundColor: "var(--base-bg-elevated)",
                  border: "1px solid var(--base-border-default)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="drawdownPct" stroke="#b84b63" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {drawdowns.topEpisodes.length === 0 ? (
            <div className="text-[12px] text-tx-tertiary">No drawdown episode captured.</div>
          ) : (
            drawdowns.topEpisodes.map((episode, index) => (
              <div key={`${episode.startTs}-${episode.troughTs}`} className="rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-tx-primary font-medium">#{index + 1} deepest drawdown</span>
                  <span className="font-mono text-down">{episode.depthPct.toFixed(2)}%</span>
                </div>
                <div className="mt-1 text-tx-tertiary">
                  Start {new Date(episode.startTs).toLocaleDateString()} {"->"} Trough {new Date(episode.troughTs).toLocaleDateString()} {"->"}
                  Recover {episode.recoveryTs ? new Date(episode.recoveryTs).toLocaleDateString() : "Not yet"}
                </div>
              </div>
            ))
          )}
        </div>
      </InsightPanel>

      <InsightPanel
        title="Breadth / Distribution"
        help="Shows whether results are broad-based across the universe, or dominated by a few outliers."
      >
        <div className="space-y-2">
          <MetricRow label="Profitable symbols" value={`${distribution.profitableSymbols}/${result.results.length} (${distribution.profitableSymbolsPct.toFixed(2)}%)`} tone={distribution.profitableSymbolsPct >= 50 ? "up" : "down"} />
          <MetricRow label="Median return" value={`${distribution.medianReturnPct >= 0 ? "+" : ""}${distribution.medianReturnPct.toFixed(2)}%`} tone={distribution.medianReturnPct >= 0 ? "up" : "down"} />
          <MetricRow label="P25 / P75 return" value={`${distribution.p25ReturnPct.toFixed(2)}% / ${distribution.p75ReturnPct.toFixed(2)}%`} />
          <MetricRow label="Return dispersion" value={`${distribution.returnStdPct.toFixed(2)}%`} />
          <MetricRow label="Sharpe dispersion" value={distribution.sharpeStd.toFixed(3)} />
          <MetricRow label="Skipped symbols" value={String(distribution.skippedSymbolsCount)} tone={distribution.skippedSymbolsCount > 0 ? "down" : "neutral"} />
        </div>
      </InsightPanel>

      <InsightPanel
        title="Benchmark Compare"
        help="Compares the strategy to an equal-weight buy-and-hold benchmark built from the same symbols and window."
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <MetricRow label="Strategy return" value={`${benchmark.strategyReturnPct >= 0 ? "+" : ""}${benchmark.strategyReturnPct.toFixed(2)}%`} tone={benchmark.strategyReturnPct >= 0 ? "up" : "down"} />
          <MetricRow label="Benchmark return" value={`${benchmark.benchmarkReturnPct >= 0 ? "+" : ""}${benchmark.benchmarkReturnPct.toFixed(2)}%`} tone={benchmark.benchmarkReturnPct >= 0 ? "up" : "down"} />
          <MetricRow label="Alpha" value={`${benchmark.alphaPct >= 0 ? "+" : ""}${benchmark.alphaPct.toFixed(2)}%`} tone={benchmark.alphaPct >= 0 ? "up" : "down"} />
          <MetricRow label="Benchmark Sharpe" value={benchmark.benchmarkSharpe.toFixed(3)} tone={benchmark.benchmarkSharpe >= 0 ? "up" : "down"} />
        </div>
        <div className="h-[170px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={benchmark.curve}>
              <CartesianGrid stroke="rgba(60, 58, 52, 0.08)" vertical={false} />
              <XAxis dataKey="index" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value: unknown, name: string | number | undefined) =>
                  [Number(value ?? 0).toFixed(2), String(name ?? "")] as [string, string]
                }
                labelFormatter={(value: unknown) => {
                  const point = benchmark.curve[Math.round(Number(value ?? 0))];
                  return point ? new Date(point.ts).toLocaleDateString() : "";
                }}
                contentStyle={{
                  backgroundColor: "var(--base-bg-elevated)",
                  border: "1px solid var(--base-border-default)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="strategyEquity" name="Strategy" stroke="var(--base-color-accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmarkEquity" name="Buy & Hold" stroke="#d39d3f" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </InsightPanel>

      <InsightPanel
        title="Long / Short Exposure"
        help="Shows how much time the engine spent long, short, or flat, and which side contributed more return."
      >
        <div className="space-y-3">
          <MetricRow label="Directional bias" value={exposure.directionalBias} />
          <MetricRow label="Long / short / flat bars" value={`${exposure.longBarsPct.toFixed(2)}% / ${exposure.shortBarsPct.toFixed(2)}% / ${exposure.flatBarsPct.toFixed(2)}%`} />
          <MetricRow label="Long contribution" value={`${exposure.longReturnPct >= 0 ? "+" : ""}${exposure.longReturnPct.toFixed(2)}%`} tone={exposure.longReturnPct >= 0 ? "up" : "down"} />
          <MetricRow label="Short contribution" value={`${exposure.shortReturnPct >= 0 ? "+" : ""}${exposure.shortReturnPct.toFixed(2)}%`} tone={exposure.shortReturnPct >= 0 ? "up" : "down"} />
          <div className="space-y-2 pt-1">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-tx-tertiary">
                <span>Long bars</span>
                <span>{exposure.longBarsPct.toFixed(2)}%</span>
              </div>
              <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
                <div className="h-full bg-up" style={{ width: `${Math.max(0, Math.min(100, exposure.longBarsPct))}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-tx-tertiary">
                <span>Short bars</span>
                <span>{exposure.shortBarsPct.toFixed(2)}%</span>
              </div>
              <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
                <div className="h-full bg-down" style={{ width: `${Math.max(0, Math.min(100, exposure.shortBarsPct))}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-tx-tertiary">
                <span>Flat bars</span>
                <span>{exposure.flatBarsPct.toFixed(2)}%</span>
              </div>
              <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
                <div className="h-full bg-[rgba(111,108,99,0.5)]" style={{ width: `${Math.max(0, Math.min(100, exposure.flatBarsPct))}%` }} />
              </div>
            </div>
          </div>
        </div>
      </InsightPanel>
    </div>
  );
}


