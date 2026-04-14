import { useState } from 'react';
import { clsx } from 'clsx';
import { DollarSign, Activity, ArrowRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { toUserErrorMessage } from '../../shared/api/client';

function formatDuration(startedAt: string | null, stoppedAt: string | null): string {
  if (!startedAt || !stoppedAt) return '-';
  const start = new Date(startedAt);
  const end = new Date(stoppedAt);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function History() {
  const { historyRuns, historyDetail, loadHistoryDetail } = useData();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    setErrorMessage(null);
    try {
      await loadHistoryDetail(runId);
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    }
  };

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
            {historyRuns.length === 0 ? (
              <div className="flex items-center justify-center h-full text-tx-tertiary text-[13px]">
                No history runs yet
              </div>
            ) : (
              historyRuns.map((run) => (
                <button
                  key={run.runId}
                  onClick={() => handleSelectRun(run.runId)}
                  className={clsx(
                    "grid grid-cols-4 items-center px-3 py-3 rounded-lg text-left transition-colors border",
                    selectedRunId === run.runId
                      ? "bg-accent-bg border-accent shadow-sm"
                      : "bg-transparent border-transparent hover:bg-hover"
                  )}
                >
                  <div className="col-span-2 flex flex-col">
                    <span className={clsx("text-[13px] font-medium", selectedRunId === run.runId ? "text-accent" : "text-tx-primary")}>
                      {run.strategyId.slice(0, 8)}...
                    </span>
                    <span className="text-[11px] text-tx-tertiary font-mono mt-0.5">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="text-[12px] text-tx-secondary font-mono">
                    {formatDuration(run.startedAt, run.stoppedAt)}
                  </div>
                  <div className={clsx(
                    "text-[13px] font-mono font-medium text-right",
                    (run.latestEquity ?? 0) >= run.initialCash ? "text-up" : "text-down"
                  )}>
                    {run.latestEquity != null
                      ? `${(run.latestEquity ?? 0) >= run.initialCash ? '+' : ''}$${Math.abs((run.latestEquity ?? 0) - run.initialCash).toFixed(2)}`
                      : '-'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="w-[360px] bg-surface border border-border-subtle rounded-xl flex flex-col shadow-sm shrink-0">
          {selectedRunId && historyDetail ? (
            <SessionDetails
              summary={historyDetail.summary}
              fillsCount={historyDetail.fills.length}
              riskEventsCount={historyDetail.riskEvents.length}
              snapshotsCount={historyDetail.snapshots.length}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-tx-tertiary text-[13px] px-4 text-center">
              {errorMessage ? (
                <div className="space-y-3">
                  <div className="text-down">{errorMessage}</div>
                  {selectedRunId && (
                    <button
                      onClick={() => {
                        void handleSelectRun(selectedRunId);
                      }}
                      className="px-3 py-2 bg-elevated border border-border-subtle rounded text-[12px] text-tx-primary hover:bg-hover"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : (
                "Select a session to view details"
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SessionDetailsProps {
  summary: {
    status: string;
    startedAt: string | null;
    stoppedAt: string | null;
    initialCash: number;
    latestEquity: number | null;
    latestDrawdownPct: number | null;
  };
  fillsCount: number;
  riskEventsCount: number;
  snapshotsCount: number;
}

function SessionDetails({ summary, fillsCount, riskEventsCount, snapshotsCount }: SessionDetailsProps) {
  const pnl = summary.latestEquity != null ? summary.latestEquity - summary.initialCash : 0;
  const isProfit = pnl >= 0;
  const normalizedStatus = summary.status.toLowerCase();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={clsx(
            "text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider",
            normalizedStatus === "stopped" ? "bg-border-subtle text-tx-secondary" : "bg-down-bg text-down"
          )}>
            {summary.status.toUpperCase()}
          </span>
        </div>
        <h2 className="text-[16px] font-medium text-tx-primary mb-1">Run {summary.startedAt ? new Date(summary.startedAt).toLocaleDateString() : ''}</h2>
        <div className="text-[12px] text-tx-tertiary font-mono flex items-center gap-2">
          {summary.startedAt ? new Date(summary.startedAt).toLocaleString() : '-'}
          <ArrowRight size={12} />
          {summary.stoppedAt ? new Date(summary.stoppedAt).toLocaleString() : '-'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-elevated border border-border-subtle p-3 rounded-lg flex flex-col">
          <span className="text-[11px] text-tx-tertiary uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign size={12}/> Final PnL</span>
          <span className={clsx("text-[18px] font-mono font-medium", isProfit ? "text-up" : "text-down")}>
            {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
          </span>
        </div>
        <div className="bg-elevated border border-border-subtle p-3 rounded-lg flex flex-col">
          <span className="text-[11px] text-tx-tertiary uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity size={12}/> Total Trades</span>
          <span className="text-[18px] font-mono font-medium text-tx-primary">
            {fillsCount}
          </span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-3">Details</h3>
        <div className="space-y-2 text-[13px] text-tx-secondary">
          <div className="flex justify-between">
            <span>Initial Cash:</span>
            <span className="font-mono">${summary.initialCash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Final Equity:</span>
            <span className="font-mono">${summary.latestEquity?.toFixed(2) ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Max Drawdown:</span>
            <span className="font-mono">{summary.latestDrawdownPct != null ? `${(summary.latestDrawdownPct * 100).toFixed(2)}%` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Risk Events:</span>
            <span className="font-mono">{riskEventsCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Snapshots:</span>
            <span className="font-mono">{snapshotsCount}</span>
          </div>
        </div>
      </div>

      <button className="w-full mt-6 py-2.5 bg-elevated border border-border-default hover:border-accent text-[13px] font-medium rounded-lg transition-colors">
        Export Trade Log (CSV)
      </button>
    </div>
  );
}
