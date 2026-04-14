import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MascotTransientState } from "../components/mascot/robotMascotState";

type MascotContextValue = {
  transient: MascotTransientState;
  setStrategyThinking: (value: boolean) => void;
  setDeploying: (value: boolean) => void;
  setBacktesting: (value: boolean) => void;
  setBacktestOutcome: (value: "success" | "warning" | null) => void;
};

const BACKTEST_OUTCOME_TTL_MS = 2_200;

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [strategyThinking, setStrategyThinking] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [backtestOutcome, setBacktestOutcome] = useState<"success" | "warning" | null>(null);

  useEffect(() => {
    if (!backtestOutcome) {
      return;
    }
    const timer = window.setTimeout(() => {
      setBacktestOutcome(null);
    }, BACKTEST_OUTCOME_TTL_MS);
    return () => window.clearTimeout(timer);
  }, [backtestOutcome]);

  const value = useMemo<MascotContextValue>(
    () => ({
      transient: {
        strategyThinking,
        deploying,
        backtesting,
        backtestOutcome,
      },
      setStrategyThinking,
      setDeploying,
      setBacktesting,
      setBacktestOutcome,
    }),
    [strategyThinking, deploying, backtesting, backtestOutcome],
  );

  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>;
}

export function useMascot(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    throw new Error("useMascot must be used within MascotProvider");
  }
  return ctx;
}
