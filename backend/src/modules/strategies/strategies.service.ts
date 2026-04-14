import type { MemoryDb } from "../../db/memory-db.js";
import type { Strategy } from "../../domain/types.js";
import type {
  StrategyCreateInput,
  StrategyRepository,
  StrategyUpdateInput,
} from "../../repositories/strategy.repository.js";
import { conflictError, notFoundError } from "../../shared/app-error.js";

export class StrategiesService {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly db: MemoryDb,
  ) {}

  async list(): Promise<Strategy[]> {
    return this.strategyRepository.list();
  }

  async create(input: StrategyCreateInput): Promise<Strategy> {
    const existing = await this.strategyRepository.findByName(input.name);
    if (existing) {
      throw conflictError(
        "conflict.strategy_name_exists",
        `Strategy name "${input.name}" already exists`,
        { strategyId: existing.id, name: input.name },
      );
    }
    return this.strategyRepository.create(input);
  }

  async update(id: string, input: StrategyUpdateInput): Promise<Strategy | null> {
    if (input.name) {
      const existing = await this.strategyRepository.findByName(input.name);
      if (existing && existing.id !== id) {
        throw conflictError(
          "conflict.strategy_name_exists",
          `Strategy name "${input.name}" already exists`,
          { strategyId: existing.id, name: input.name },
        );
      }
    }
    return this.strategyRepository.update(id, input);
  }

  async remove(id: string): Promise<void> {
    const strategy = await this.strategyRepository.getById(id);
    if (!strategy) {
      throw notFoundError("not_found.strategy", `Strategy ${id} does not exist`, { strategyId: id });
    }

    const running = await this.db.read((tx) => tx.listRuns().find((run) => run.strategyId === id && run.status === "running"));
    if (running) {
      throw conflictError(
        "conflict.strategy_in_use",
        `Strategy ${id} is attached to an active run and cannot be deleted`,
        { strategyId: id, runId: running.id },
      );
    }

    await this.strategyRepository.remove(id);
  }
}
