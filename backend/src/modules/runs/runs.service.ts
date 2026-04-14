import type { MemoryDb } from "../../db/memory-db.js";
import type { Run } from "../../domain/types.js";
import type { StrategyRepository } from "../../repositories/strategy.repository.js";
import type { AccountService } from "../account/account.service.js";
import type { EventHub } from "../ws/event-hub.js";
import { conflictError, notFoundError } from "../../shared/app-error.js";

export class RunsService {
  constructor(
    private readonly db: MemoryDb,
    private readonly strategyRepository: StrategyRepository,
    private readonly eventHub: EventHub,
    private readonly accountService: AccountService,
  ) {}

  async list(): Promise<Run[]> {
    return this.db.read((tx) => tx.listRuns());
  }

  async getActiveRun(): Promise<Run | null> {
    return this.db.read((tx) => tx.getActiveRun());
  }

  async start(input: { strategyId: string; initialCash: number }): Promise<Run> {
    const strategy = await this.strategyRepository.getById(input.strategyId);
    if (!strategy) {
      throw notFoundError("not_found.strategy", `Strategy ${input.strategyId} does not exist`, {
        strategyId: input.strategyId,
      });
    }

    const run = await this.db.withTransaction(async (tx) => {
      try {
        return tx.startRun(input);
      } catch (error) {
        if (error instanceof Error && error.message === "active_run_exists") {
          throw conflictError("conflict.active_run_exists", "Only one active run is allowed in V1");
        }
        throw error;
      }
    });
    this.eventHub.publish({
      type: "run.updated",
      ts: new Date().toISOString(),
      data: { run },
    });
    const summary = await this.accountService.getSummary("run_start");
    this.eventHub.publish({
      type: "account.updated",
      ts: summary.updatedAt,
      data: { accountSummary: summary },
    });
    return run;
  }

  async stop(runId: string, stopReason: string): Promise<Run | null> {
    const run = await this.db.withTransaction(async (tx) => tx.stopRun(runId, stopReason));
    if (!run) {
      return null;
    }
    this.eventHub.publish({
      type: "run.updated",
      ts: new Date().toISOString(),
      data: { run },
    });
    const summary = await this.accountService.getSummary("run_stop");
    this.eventHub.publish({
      type: "account.updated",
      ts: summary.updatedAt,
      data: { accountSummary: summary },
    });
    return run;
  }
}
