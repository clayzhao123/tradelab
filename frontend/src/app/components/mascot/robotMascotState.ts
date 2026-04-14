import type { RiskEvent } from "../../../shared/api/client";

export type MascotState =
  | "idle"
  | "thinking-strategy"
  | "deploying"
  | "running-watch"
  | "backtesting"
  | "backtest-success"
  | "backtest-warning"
  | "pnl-up"
  | "pnl-down"
  | "risk-alert"
  | "paused"
  | "disconnected";

export type MascotSnapshot = {
  state: MascotState;
  mood: "neutral" | "positive" | "warning" | "danger";
  message: string;
};

export type MascotTransientState = {
  strategyThinking: boolean;
  deploying: boolean;
  backtesting: boolean;
  backtestOutcome: "success" | "warning" | null;
};

export type DeriveMascotStateInput = {
  pathname: string;
  wsStatus: "connecting" | "open" | "closed" | "error";
  activeRun: { initialCash: number } | null;
  equity: number | null;
  drawdownPct: number | null;
  riskEvents: RiskEvent[];
  transient: MascotTransientState;
  nowMs?: number;
};

const PNL_THRESHOLD_PCT = 1.5;
const RISK_WARN_DRAWDOWN = 0.08;
const RISK_RECENT_WINDOW_MS = 30_000;

function hasRecentRiskEvent(riskEvents: RiskEvent[], nowMs: number): boolean {
  return riskEvents.some((event) => {
    const occurredAtMs = Date.parse(event.occurredAt);
    if (!Number.isFinite(occurredAtMs)) {
      return false;
    }
    return nowMs - occurredAtMs <= RISK_RECENT_WINDOW_MS;
  });
}

function toPnlPct(activeRun: { initialCash: number } | null, equity: number | null): number | null {
  if (!activeRun || !Number.isFinite(activeRun.initialCash) || activeRun.initialCash <= 0) {
    return null;
  }
  if (!Number.isFinite(equity ?? NaN)) {
    return null;
  }
  return (((equity as number) - activeRun.initialCash) / activeRun.initialCash) * 100;
}

function snapshot(
  state: MascotState,
  mood: MascotSnapshot["mood"],
  message: string,
): MascotSnapshot {
  return { state, mood, message };
}

export function deriveRobotMascotState(input: DeriveMascotStateInput): MascotSnapshot {
  const nowMs = input.nowMs ?? Date.now();
  const drawdownPct = input.drawdownPct ?? 0;
  const hasActiveRun = Boolean(input.activeRun);

  const riskTriggered =
    drawdownPct >= RISK_WARN_DRAWDOWN ||
    hasRecentRiskEvent(input.riskEvents, nowMs) ||
    input.riskEvents.some((event) => event.severity === "critical");
  if (riskTriggered) {
    return snapshot("risk-alert", "danger", "Risk alert");
  }

  if (input.transient.deploying) {
    return snapshot("deploying", "neutral", "Deploying bot");
  }
  if (input.transient.backtesting) {
    return snapshot("backtesting", "neutral", "Running backtest");
  }
  if (input.transient.backtestOutcome === "success") {
    return snapshot("backtest-success", "positive", "Backtest completed");
  }
  if (input.transient.backtestOutcome === "warning") {
    return snapshot("backtest-warning", "warning", "Backtest needs review");
  }
  if (input.pathname.startsWith("/strategy") && input.transient.strategyThinking) {
    return snapshot("thinking-strategy", "neutral", "Crafting strategy");
  }

  if (hasActiveRun) {
    const pnlPct = toPnlPct(input.activeRun, input.equity);
    if (pnlPct !== null) {
      if (pnlPct >= PNL_THRESHOLD_PCT) {
        return snapshot("pnl-up", "positive", "PnL trending up");
      }
      if (pnlPct <= -PNL_THRESHOLD_PCT) {
        return snapshot("pnl-down", "warning", "PnL trending down");
      }
    }
    return snapshot("running-watch", "neutral", "Watching live run");
  }

  if (input.wsStatus === "closed" || input.wsStatus === "error") {
    return snapshot("disconnected", "warning", "Realtime disconnected");
  }

  if (input.pathname.startsWith("/strategy")) {
    return snapshot("thinking-strategy", "neutral", "Strategy workspace");
  }
  if (input.pathname.startsWith("/runner")) {
    return snapshot("paused", "neutral", "Ready to deploy");
  }

  return snapshot("idle", "neutral", "Idle");
}
