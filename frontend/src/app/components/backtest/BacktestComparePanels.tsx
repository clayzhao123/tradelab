import type { ReactNode } from "react";
import type { BacktestHistoryDetail } from "../../../shared/api/client";
import { PanelInfoButton } from "../common/PanelInfoButton";
import { buildCompareSnapshot } from "./backtestInsights";

type BacktestComparePanelsProps = {
  details: BacktestHistoryDetail[];
};

type CompareDirection = "higher" | "lower";

function ComparePanel({
  title,
  help,
  rows,
  snapshots,
}: {
  title: string;
  help: string;
  rows: Array<{
    label: string;
    value: (snapshot: ReturnType<typeof buildCompareSnapshot>) => ReactNode;
    score?: (snapshot: ReturnType<typeof buildCompareSnapshot>) => number;
    direction?: CompareDirection;
  }>;
  snapshots: ReturnType<typeof buildCompareSnapshot>[];
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">{title}</div>
        <PanelInfoButton label={help} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead>
            <tr className="border-b border-border-subtle text-tx-tertiary">
              <th className="text-left py-2">Metric</th>
              {snapshots.map((snapshot) => (
                <th key={snapshot.id} className="text-left py-2">
                  <div className="text-tx-primary font-medium">{snapshot.strategyName}</div>
                  <div className="font-normal">{new Date(snapshot.generatedAt).toLocaleString()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasScore = typeof row.score === "function";
              const scoredValues = hasScore
                ? snapshots.map((snapshot) => ({ id: snapshot.id, score: row.score!(snapshot) }))
                : [];
              const validScores = scoredValues
                .map((item) => item.score)
                .filter((value) => Number.isFinite(value));
              const bestScore =
                validScores.length > 0
                  ? row.direction === "lower"
                    ? Math.min(...validScores)
                    : Math.max(...validScores)
                  : null;
              const worstScore =
                validScores.length > 0
                  ? row.direction === "lower"
                    ? Math.max(...validScores)
                    : Math.min(...validScores)
                  : null;
              const isComparable = validScores.length > 1 && bestScore !== null && worstScore !== null && bestScore !== worstScore;

              return (
                <tr key={row.label} className="border-b border-border-subtle/60">
                  <td className="py-2 text-tx-tertiary">{row.label}</td>
                  {snapshots.map((snapshot) => {
                    const currentScore = hasScore ? row.score!(snapshot) : Number.NaN;
                    const isBest = isComparable && currentScore === bestScore;
                    const isWorst = isComparable && currentScore === worstScore;
                    return (
                      <td key={`${snapshot.id}-${row.label}`} className="py-2 font-mono text-tx-primary">
                        <span className={isBest ? "text-up" : isWorst ? "text-down" : "text-tx-primary"}>
                          {row.value(snapshot)}
                        </span>
                        {isBest ? <span className="ml-2 text-[10px] text-up">Best</span> : null}
                        {isWorst ? <span className="ml-2 text-[10px] text-down">Worst</span> : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BacktestComparePanels({ details }: BacktestComparePanelsProps) {
  const snapshots = details.map((detail) => buildCompareSnapshot(detail));

  return (
    <div className="flex flex-col gap-4">
      <ComparePanel
        title="Compare Overview"
        help="Compares the headline performance and universe size of the selected backtest history entries."
        snapshots={snapshots}
        rows={[
          { label: "Label", value: (snapshot) => snapshot.label },
          { label: "Symbols", value: (snapshot) => String(snapshot.symbolsCount) },
          {
            label: "Portfolio return",
            value: (snapshot) => `${snapshot.portfolioReturnPct >= 0 ? "+" : ""}${snapshot.portfolioReturnPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.portfolioReturnPct,
            direction: "higher",
          },
          {
            label: "Max drawdown",
            value: (snapshot) => `${snapshot.maxDrawdownPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.maxDrawdownPct,
            direction: "lower",
          },
          { label: "Sharpe", value: (snapshot) => snapshot.sharpe.toFixed(3), score: (snapshot) => snapshot.sharpe, direction: "higher" },
          {
            label: "Avg stability",
            value: (snapshot) => snapshot.avgStabilityScore.toFixed(2),
            score: (snapshot) => snapshot.avgStabilityScore,
            direction: "higher",
          },
        ]}
      />

      <ComparePanel
        title="Compare Trade Stats"
        help="Compares true trade-level behavior for each selected run, not just bar-level win rates."
        snapshots={snapshots}
        rows={[
          { label: "Total trades", value: (snapshot) => String(snapshot.totalTrades), score: (snapshot) => snapshot.totalTrades, direction: "higher" },
          {
            label: "Trade win rate",
            value: (snapshot) => `${snapshot.tradeWinRatePct.toFixed(2)}%`,
            score: (snapshot) => snapshot.tradeWinRatePct,
            direction: "higher",
          },
          {
            label: "Expectancy",
            value: (snapshot) => `${snapshot.expectancyPct >= 0 ? "+" : ""}${snapshot.expectancyPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.expectancyPct,
            direction: "higher",
          },
        ]}
      />

      <ComparePanel
        title="Compare Breadth"
        help="Shows whether each run won broadly across the universe or depended on a handful of strong symbols."
        snapshots={snapshots}
        rows={[
          {
            label: "Profitable symbols",
            value: (snapshot) => `${snapshot.profitableSymbolsPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.profitableSymbolsPct,
            direction: "higher",
          },
          {
            label: "Median symbol return",
            value: (snapshot) => `${snapshot.medianReturnPct >= 0 ? "+" : ""}${snapshot.medianReturnPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.medianReturnPct,
            direction: "higher",
          },
        ]}
      />

      <ComparePanel
        title="Compare Benchmark"
        help="Shows which run created more alpha versus equal-weight buy and hold."
        snapshots={snapshots}
        rows={[
          {
            label: "Benchmark return",
            value: (snapshot) => `${snapshot.benchmarkReturnPct >= 0 ? "+" : ""}${snapshot.benchmarkReturnPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.benchmarkReturnPct,
            direction: "higher",
          },
          {
            label: "Alpha",
            value: (snapshot) => `${snapshot.alphaPct >= 0 ? "+" : ""}${snapshot.alphaPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.alphaPct,
            direction: "higher",
          },
        ]}
      />

      <ComparePanel
        title="Compare Exposure"
        help="Shows whether the selected runs leaned long, short, or stayed flat more often."
        snapshots={snapshots}
        rows={[
          { label: "Long bars", value: (snapshot) => `${snapshot.longBarsPct.toFixed(2)}%`, score: (snapshot) => snapshot.longBarsPct, direction: "higher" },
          { label: "Short bars", value: (snapshot) => `${snapshot.shortBarsPct.toFixed(2)}%`, score: (snapshot) => snapshot.shortBarsPct, direction: "higher" },
          { label: "Flat bars", value: (snapshot) => `${snapshot.flatBarsPct.toFixed(2)}%`, score: (snapshot) => snapshot.flatBarsPct, direction: "lower" },
          {
            label: "Long contribution",
            value: (snapshot) => `${snapshot.longReturnPct >= 0 ? "+" : ""}${snapshot.longReturnPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.longReturnPct,
            direction: "higher",
          },
          {
            label: "Short contribution",
            value: (snapshot) => `${snapshot.shortReturnPct >= 0 ? "+" : ""}${snapshot.shortReturnPct.toFixed(2)}%`,
            score: (snapshot) => snapshot.shortReturnPct,
            direction: "higher",
          },
        ]}
      />
    </div>
  );
}


