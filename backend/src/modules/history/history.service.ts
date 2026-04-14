import type { MemoryDb } from "../../db/memory-db.js";
import type { AccountSnapshot, Fill, RiskEvent, Run } from "../../domain/types.js";

const MAX_SNAPSHOTS_PER_RUN = 1000;
const DEFAULT_SNAPSHOT_SAMPLE_EVERY = 2;

function sampleSnapshots(snapshots: AccountSnapshot[], every: number): AccountSnapshot[] {
  if (every <= 1) return snapshots;
  return snapshots.filter((_, i) => i % every === 0);
}

function trimSnapshots(snapshots: AccountSnapshot[], limit: number): AccountSnapshot[] {
  if (snapshots.length <= limit) return snapshots;
  return snapshots.slice(-limit);
}

type RunHistorySummary = {
  runId: string;
  strategyId: string;
  status: Run["status"];
  startedAt: string | null;
  stoppedAt: string | null;
  stopReason: string | null;
  initialCash: number;
  fillsCount: number;
  riskEventsCount: number;
  turnover: number;
  fees: number;
  latestEquity: number | null;
  latestDrawdownPct: number | null;
  updatedAt: string;
};

type RunHistoryDetail = {
  run: Run;
  summary: RunHistorySummary;
  fills: Fill[];
  riskEvents: RiskEvent[];
  snapshots: AccountSnapshot[];
};

const summarizeRun = (run: Run, fills: Fill[], riskEvents: RiskEvent[], latestSnapshot: AccountSnapshot | null): RunHistorySummary => {
  const turnover = fills.reduce((sum, fill) => sum + Math.abs(fill.quantity * fill.price), 0);
  const fees = fills.reduce((sum, fill) => sum + fill.fee, 0);
  return {
    runId: run.id,
    strategyId: run.strategyId,
    status: run.status,
    startedAt: run.startedAt,
    stoppedAt: run.stoppedAt,
    stopReason: run.stopReason,
    initialCash: run.initialCash,
    fillsCount: fills.length,
    riskEventsCount: riskEvents.length,
    turnover: Number(turnover.toFixed(2)),
    fees: Number(fees.toFixed(4)),
    latestEquity: latestSnapshot?.equity ?? null,
    latestDrawdownPct: latestSnapshot?.drawdownPct ?? null,
    updatedAt: latestSnapshot?.createdAt ?? run.updatedAt,
  };
};

const applySnapshotSampling = (snapshots: AccountSnapshot[], sampleEvery: number): AccountSnapshot[] => {
  return sampleSnapshots(snapshots, sampleEvery);
};

function cleanOldSnapshots(runId: string, maxSnapshots: number, getSnapshots: () => AccountSnapshot[]): AccountSnapshot[] {
  const snapshots = getSnapshots();
  return trimSnapshots(snapshots, maxSnapshots);
}

export class HistoryService {
  constructor(private readonly db: MemoryDb) {}

  async listRunSummaries(limit: number): Promise<RunHistorySummary[]> {
    return this.db.read((tx) => {
      const runs = tx.listRuns().slice(0, limit);
      return runs.map((run) => {
        const fills = tx.listFills({ runId: run.id, limit: 5000 });
        const riskEvents = tx.listRiskEvents({ runId: run.id, limit: 5000 });
        const latestSnapshot = tx.listAccountSnapshots({ runId: run.id, limit: 1 })[0] ?? null;
        return summarizeRun(run, fills, riskEvents, latestSnapshot);
      });
    });
  }

  async getRunDetail(input: {
    runId: string;
    fillsLimit: number;
    eventsLimit: number;
    snapshotsLimit: number;
    snapshotSampleEvery: number;
  }): Promise<RunHistoryDetail | null> {
    return this.db.read((tx) => {
      const run = tx.getRunById(input.runId);
      if (!run) {
        return null;
      }
      const fills = tx.listFills({ runId: run.id, limit: input.fillsLimit });
      const riskEvents = tx.listRiskEvents({ runId: run.id, limit: input.eventsLimit });
      const snapshots = tx.listAccountSnapshots({ runId: run.id, limit: input.snapshotsLimit });
      const sampledSnapshots = applySnapshotSampling(snapshots, input.snapshotSampleEvery);
      const summary = summarizeRun(run, fills, riskEvents, sampledSnapshots[0] ?? null);
      return {
        run,
        summary,
        fills,
        riskEvents,
        snapshots: sampledSnapshots,
      };
    });
  }
}

export type { RunHistoryDetail, RunHistorySummary };

