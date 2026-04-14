import type { MemoryDb } from "../../db/memory-db.js";
import type { AccountSummary, Position, RiskEvent, RiskRules } from "../../domain/types.js";
import type { EventHub } from "../ws/event-hub.js";
import { riskError } from "../../shared/app-error.js";

type EvaluateOrderInput = {
  runId: string | null;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  referencePrice: number;
  accountSummary: AccountSummary;
  positions: Position[];
};

export class RiskService {
  constructor(
    private readonly db: MemoryDb,
    private readonly eventHub: EventHub,
  ) {}

  async getRules(): Promise<RiskRules> {
    return this.db.read((tx) => tx.getRiskRules());
  }

  async updateRules(patch: Partial<RiskRules>): Promise<RiskRules> {
    return this.db.withTransaction(async (tx) => tx.updateRiskRules(patch));
  }

  async getEvents(input?: { limit?: number; severity?: RiskEvent["severity"]; runId?: string }): Promise<RiskEvent[]> {
    return this.db.read((tx) => tx.listRiskEvents(input));
  }

  async evaluateOrder(input: EvaluateOrderInput): Promise<void> {
    const rules = await this.getRules();
    if (!rules.isEnabled) {
      return;
    }

    const symbol = input.symbol.toUpperCase();
    const notional = input.quantity * input.referencePrice;
    const equity = Math.max(1, input.accountSummary.equity);

    if (notional > rules.maxOrderNotional) {
      await this.triggerEvent({
        ruleName: "max_order_notional",
        severity: "critical",
        runId: input.runId,
        symbol,
        observedValue: notional,
        limitValue: rules.maxOrderNotional,
        message: "Order notional exceeds maxOrderNotional rule",
      });
      throw riskError("risk.max_order_notional", "Order notional exceeds configured maximum", {
        symbol,
        observedValue: notional,
        limitValue: rules.maxOrderNotional,
      });
    }

    const currentSymbolExposure =
      input.positions.find((position) => position.symbol === symbol)?.marketValue ?? 0;
    const projectedSymbolExposure =
      Math.abs(currentSymbolExposure + (input.side === "buy" ? notional : -notional)) / equity;
    if (projectedSymbolExposure > rules.maxSymbolExposurePct) {
      await this.triggerEvent({
        ruleName: "max_symbol_exposure_pct",
        severity: "critical",
        runId: input.runId,
        symbol,
        observedValue: projectedSymbolExposure,
        limitValue: rules.maxSymbolExposurePct,
        message: "Projected symbol exposure exceeds configured limit",
      });
      throw riskError("risk.max_symbol_exposure_pct", "Projected symbol exposure exceeds configured limit", {
        symbol,
        observedValue: projectedSymbolExposure,
        limitValue: rules.maxSymbolExposurePct,
      });
    }

    const grossExposureNow = input.positions.reduce((sum, position) => sum + Math.abs(position.marketValue), 0);
    const projectedGrossExposurePct = (grossExposureNow + notional) / equity;
    if (projectedGrossExposurePct > rules.maxGrossExposurePct) {
      await this.triggerEvent({
        ruleName: "max_gross_exposure_pct",
        severity: "critical",
        runId: input.runId,
        symbol,
        observedValue: projectedGrossExposurePct,
        limitValue: rules.maxGrossExposurePct,
        message: "Projected gross exposure exceeds configured limit",
      });
      throw riskError("risk.max_gross_exposure_pct", "Projected gross exposure exceeds configured limit", {
        symbol,
        observedValue: projectedGrossExposurePct,
        limitValue: rules.maxGrossExposurePct,
      });
    }

    if (input.side === "buy") {
      const projectedCash = input.accountSummary.cashBalance - notional;
      if (projectedCash < rules.minCashBalance) {
        await this.triggerEvent({
        ruleName: "min_cash_balance",
        severity: "warning",
        runId: input.runId,
        symbol,
          observedValue: projectedCash,
          limitValue: rules.minCashBalance,
          message: "Projected cash balance falls below configured minimum",
        });
        throw riskError("risk.min_cash_balance", "Projected cash balance falls below configured minimum", {
          symbol,
          observedValue: projectedCash,
          limitValue: rules.minCashBalance,
        });
      }
    }

    if (input.accountSummary.drawdownPct > rules.maxDrawdownPct) {
      await this.triggerEvent({
        ruleName: "max_drawdown_pct",
        severity: "critical",
        runId: input.runId,
        symbol: null,
        observedValue: input.accountSummary.drawdownPct,
        limitValue: rules.maxDrawdownPct,
        message: "Current drawdown exceeds configured maximum",
      });
      throw riskError("risk.max_drawdown_pct", "Current drawdown exceeds configured maximum", {
        observedValue: input.accountSummary.drawdownPct,
        limitValue: rules.maxDrawdownPct,
      });
    }
  }

  private async triggerEvent(input: Omit<RiskEvent, "id" | "occurredAt">): Promise<RiskEvent> {
    return this.db.withTransaction(async (tx) => {
      const created = tx.addRiskEvent({
        ...input,
        occurredAt: new Date().toISOString(),
      });
      this.eventHub.publish({
        type: "risk.triggered",
        ts: created.occurredAt,
        data: { event: created },
      });
      return created;
    });
  }
}
