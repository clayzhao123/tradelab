import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Play, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { useData } from "../contexts/DataContext";
import { useMascot } from "../contexts/MascotContext";
import { toUserErrorMessage } from "../../shared/api/client";

export function BotRunner() {
  const { activeRun, strategies, startRun, stopRun, riskRules, updateRiskRules } = useData();
  const { setDeploying } = useMascot();

  const [manualStrategyId, setManualStrategyId] = useState<string>("");
  const [initialCash, setInitialCash] = useState(100000);
  const [maxDrawdownStopPct, setMaxDrawdownStopPct] = useState(12);
  const [maxOrderNotional, setMaxOrderNotional] = useState(15000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRunning = Boolean(activeRun);

  const selectedStrategyId = useMemo(() => {
    if (manualStrategyId && strategies.some((strategy) => strategy.id === manualStrategyId)) {
      return manualStrategyId;
    }
    return strategies[0]?.id ?? "";
  }, [manualStrategyId, strategies]);

  const selectedStrategyName = useMemo(() => {
    return strategies.find((strategy) => strategy.id === selectedStrategyId)?.name ?? "-";
  }, [selectedStrategyId, strategies]);

  const handleToggleRun = async (): Promise<void> => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isRunning && activeRun) {
        await stopRun(activeRun.id, "manual_stop_from_ui");
      } else if (selectedStrategyId) {
        await startRun({ strategyId: selectedStrategyId, initialCash });
      }
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRisk = async (): Promise<void> => {
    setErrorMessage(null);

    if (!(maxDrawdownStopPct > 0 && maxDrawdownStopPct < 100)) {
      setErrorMessage("Drawdown stop must be between 0 and 100");
      return;
    }

    if (!(maxOrderNotional > 0)) {
      setErrorMessage("Max order notional must be greater than 0");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateRiskRules({
        maxDrawdownPct: maxDrawdownStopPct / 100,
        maxOrderNotional,
      });
    } catch (error) {
      setErrorMessage(toUserErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setDeploying(isSubmitting);
    return () => setDeploying(false);
  }, [isSubmitting, setDeploying]);

  return (
    <div className="w-full h-full flex justify-center items-start p-6 overflow-y-auto">
      <div className="w-full max-w-[680px] flex flex-col gap-6">
        <div className="text-center mb-2 mt-4">
          <div className="w-16 h-16 bg-surface border border-border-default rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm relative">
            <Bot size={32} className="text-accent" />
            {isRunning && <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-up rounded-full border-2 border-surface animate-pulse" />}
          </div>
          <h1 className="text-[24px] font-medium text-tx-primary mb-1">Deploy Trading Bot</h1>
          <p className="text-[13px] text-tx-secondary">Start/stop one active run and persist risk controls before execution.</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Select Strategy</label>
            <select
              disabled={isRunning}
              value={selectedStrategyId}
              onChange={(event) => setManualStrategyId(event.target.value)}
              className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary outline-none focus:border-accent disabled:opacity-50"
            >
              {strategies.length === 0 && <option value="">No strategies available</option>}
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Initial Cash ($)</label>
              <input
                disabled={isRunning}
                type="number"
                min="0"
                value={initialCash}
                onChange={(event) => setInitialCash(Number(event.target.value))}
                className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Active Strategy</label>
              <div className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary">
                {selectedStrategyName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 pt-5 border-t border-border-subtle">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary flex items-center gap-1.5 text-down">
                <AlertTriangle size={12} /> Max Drawdown Stop (%)
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={maxDrawdownStopPct}
                onChange={(event) => setMaxDrawdownStopPct(Number(event.target.value))}
                className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent"
              />
              <span className="text-[11px] text-tx-tertiary">
                Current backend value: {riskRules ? `${(riskRules.maxDrawdownPct * 100).toFixed(2)}%` : "-"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary flex items-center gap-1.5 text-up">
                <ShieldCheck size={12} /> Max Order Notional ($)
              </label>
              <input
                type="number"
                min="1"
                value={maxOrderNotional}
                onChange={(event) => setMaxOrderNotional(Number(event.target.value))}
                className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent"
              />
              <span className="text-[11px] text-tx-tertiary">
                Current backend value: {riskRules ? riskRules.maxOrderNotional.toLocaleString() : "-"}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              void handleUpdateRisk();
            }}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-elevated border border-border-default text-[13px] font-medium text-tx-primary hover:bg-hover disabled:opacity-50"
          >
            Apply Risk Settings
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down">{errorMessage}</div>
        )}

        <button
          onClick={() => {
            void handleToggleRun();
          }}
          disabled={isSubmitting || (!isRunning && !selectedStrategyId)}
          className={clsx(
            "w-full py-3.5 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-md",
            isRunning
              ? "bg-page border border-border-strong text-tx-primary hover:bg-hover shadow-none"
              : "bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isRunning ? "STOP BOT" : <><Play size={16} fill="currentColor" /> DEPLOY & START BOT</>}
        </button>
      </div>
    </div>
  );
}
