import type { MemoryDb } from "../../db/memory-db.js";
import type { AccountSnapshot, AccountSummary, EquityPoint, Position, SnapshotSource } from "../../domain/types.js";

export class AccountService {
  constructor(private readonly db: MemoryDb) {}

  async getSummary(source: SnapshotSource = "interval"): Promise<AccountSummary> {
    return this.db.withTransaction(async (tx) => {
      const summary = tx.getAccountSummary();
      const activeRunId = tx.getActiveRun()?.id ?? null;
      tx.pushEquityPoint({
        ts: summary.updatedAt,
        equity: summary.equity,
        cashBalance: summary.cashBalance,
      });
      tx.addAccountSnapshot({
        runId: activeRunId,
        source,
        cashBalance: summary.cashBalance,
        equity: summary.equity,
        buyingPower: summary.buyingPower,
        grossExposure: summary.grossExposure,
        netExposure: summary.netExposure,
        unrealizedPnl: summary.unrealizedPnl,
        realizedPnl: summary.realizedPnl,
        drawdownPct: summary.drawdownPct,
        createdAt: summary.updatedAt,
      });
      return summary;
    });
  }

  async getPositions(): Promise<Position[]> {
    return this.db.read((tx) => tx.listPositions());
  }

  async getEquityCurve(limit: number): Promise<EquityPoint[]> {
    return this.db.read((tx) => tx.listEquityPoints(limit));
  }

  async getSnapshots(input?: { runId?: string; limit?: number; from?: string; to?: string }): Promise<AccountSnapshot[]> {
    return this.db.read((tx) => tx.listAccountSnapshots(input));
  }
}
