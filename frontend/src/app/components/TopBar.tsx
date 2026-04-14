import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { clsx } from 'clsx';
import { useData } from '../contexts/DataContext';

interface TopBarProps {
  isRunning: boolean;
  isDark: boolean;
  toggleTheme: () => void;
  equity?: number;
  drawdownPct?: number;
  runStartedAt?: string | null;
  wsStatus?: "connecting" | "open" | "closed" | "error";
}

function formatNum(value: number, digits = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatRunDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TopBar({
  isRunning,
  isDark,
  toggleTheme,
  equity = 0,
  drawdownPct = 0,
  runStartedAt = null,
  wsStatus = "connecting",
}: TopBarProps) {
  const { quotes } = useData();
  const [nowTs, setNowTs] = useState(() => Date.now());

  const btcQuote = quotes.find(q => q.symbol === "BTCUSDT");
  const ethQuote = quotes.find(q => q.symbol === "ETHUSDT");
  const solQuote = quotes.find(q => q.symbol === "SOLUSDT");

  const wsStatusColor = wsStatus === "open" ? "bg-up" : wsStatus === "connecting" ? "bg-warning" : "bg-down";
  const wsStatusText = wsStatus === "open" ? "Connected" : wsStatus === "connecting" ? "Connecting" : "Disconnected";
  const uptimeText = useMemo(() => {
    if (!isRunning || !runStartedAt) {
      return "--:--:--";
    }
    const startedAtMs = new Date(runStartedAt).getTime();
    if (!Number.isFinite(startedAtMs)) {
      return "--:--:--";
    }
    return formatRunDuration(nowTs - startedAtMs);
  }, [isRunning, runStartedAt, nowTs]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-surface border-b border-border-subtle sticky top-0 z-50">
      {/* Left: Status */}
      <div className="flex items-center gap-3 w-[240px]">
        <div className="flex items-center gap-2 px-2 py-1 -ml-2 rounded-sm">
          <div className="relative flex items-center justify-center w-4 h-4">
            {isRunning ? (
              <>
                <div className="absolute w-2 h-2 rounded-full bg-up z-10" />
                <div className="absolute w-2 h-2 rounded-full bg-up animate-ping opacity-50" style={{ animationDuration: '2s' }} />
              </>
            ) : (
              <div className="w-2 h-2 bg-tx-tertiary rounded-sm" />
            )}
          </div>
          <span className="text-[13px] font-medium tracking-wide text-tx-secondary">
            {isRunning ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>

        {/* WS Status */}
        <div className="flex items-center gap-1.5">
          <div className={clsx("w-2 h-2 rounded-full", wsStatusColor)} />
          <span className="text-[11px] text-tx-tertiary">{wsStatusText}</span>
        </div>
      </div>

      {/* Middle: Ticker */}
      <div className="flex-1 flex justify-center items-center gap-6">
        {btcQuote && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-tx-secondary font-medium">BTC</span>
            <span className="font-mono text-tx-primary font-medium">{formatNum(btcQuote.last, 2)}</span>
          </div>
        )}
        {ethQuote && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-tx-secondary font-medium">ETH</span>
            <span className="font-mono text-tx-primary font-medium">{formatNum(ethQuote.last, 2)}</span>
          </div>
        )}
        {solQuote && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-tx-secondary font-medium">SOL</span>
            <span className="font-mono text-tx-primary font-medium">{formatNum(solQuote.last, 2)}</span>
          </div>
        )}
      </div>

      {/* Right: Portfolio Stats & Theme */}
      <div className="flex items-center justify-end gap-6 w-[440px]">
        {isRunning ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-mono text-tx-primary font-medium">${formatNum(equity)}</span>
              <span className={clsx(
                "font-mono text-[13px] font-medium px-1 rounded",
                drawdownPct > 0 ? "text-down bg-down-bg" : "text-tx-secondary bg-border-subtle"
              )}>
                -{Math.max(0, drawdownPct * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="text-tx-tertiary font-medium">DD:</span>
              <span className="font-mono text-down font-medium">-{Math.max(0, drawdownPct * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="text-tx-tertiary font-medium">RUN:</span>
              <span className="font-mono text-tx-primary font-medium">{uptimeText}</span>
            </div>
          </>
        ) : (
          <div className="text-[13px] text-tx-tertiary">
            Bot 未运行，资产与回撤将在启动后显示
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="text-tx-tertiary hover:text-tx-primary transition-colors p-1"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
