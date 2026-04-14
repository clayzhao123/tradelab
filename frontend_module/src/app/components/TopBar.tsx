import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';

interface TopBarProps {
  isRunning: boolean;
  toggleRunning: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function TopBar({ isRunning, toggleRunning, isDark, toggleTheme }: TopBarProps) {
  return (
    <div className="h-12 flex items-center justify-between px-4 bg-surface border-b border-border-subtle sticky top-0 z-50">
      {/* Left: Status */}
      <div className="flex items-center gap-3 w-[240px]">
        <button 
          onClick={toggleRunning}
          className="flex items-center gap-2 hover:bg-hover px-2 py-1 -ml-2 rounded-sm transition-colors"
        >
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
        </button>
      </div>

      {/* Middle: Ticker */}
      <div className="flex-1 flex justify-center items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-tx-secondary font-medium">BTC</span>
          <span className="font-mono text-tx-primary font-medium">43,280.50</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-tx-secondary font-medium">ETH</span>
          <span className="font-mono text-tx-primary font-medium">2,314.20</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-tx-secondary font-medium">SOL</span>
          <span className="font-mono text-tx-primary font-medium">108.45</span>
        </div>
      </div>

      {/* Right: Portfolio Stats & Theme */}
      <div className="flex items-center justify-end gap-6 w-[300px]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-tx-primary font-medium">$124,320.00</span>
          <span className="font-mono text-[13px] text-up font-medium bg-up-bg px-1 rounded">+3.2%</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="text-tx-tertiary font-medium">DD:</span>
          <span className="font-mono text-down font-medium">-0.8%</span>
        </div>
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
