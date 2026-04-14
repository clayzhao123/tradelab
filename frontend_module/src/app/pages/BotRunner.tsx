import React, { useState } from 'react';
import { Play, Bot, AlertTriangle, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

export function BotRunner() {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="w-full h-full flex justify-center items-start p-6 overflow-y-auto">
      <div className="w-full max-w-[600px] flex flex-col gap-6">
        <div className="text-center mb-2 mt-4">
          <div className="w-16 h-16 bg-surface border border-border-default rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm relative">
            <Bot size={32} className="text-accent" />
            {isRunning && <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-up rounded-full border-2 border-surface animate-pulse" />}
          </div>
          <h1 className="text-[24px] font-medium text-tx-primary mb-1">Deploy Trading Bot</h1>
          <p className="text-[13px] text-tx-secondary">Configure parameters and launch your automated strategy into the live paper-trading market.</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Select Strategy</label>
            <select disabled={isRunning} className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary outline-none focus:border-accent disabled:opacity-50">
              <option>RSI-MACD Alpha Matrix</option>
              <option>Volatility Breakout V2</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary flex items-center justify-between">
                Trade Size <span className="lowercase text-[10px]">% of Equity</span>
              </label>
              <input disabled={isRunning} type="number" defaultValue="5" className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent disabled:opacity-50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Leverage</label>
              <select disabled={isRunning} className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent disabled:opacity-50">
                <option>1x (Spot)</option>
                <option>2x</option>
                <option>5x</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 pt-5 border-t border-border-subtle">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary flex items-center gap-1.5 text-down">
                <AlertTriangle size={12} /> Stop Loss (%)
              </label>
              <input disabled={isRunning} type="number" defaultValue="2.5" className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent disabled:opacity-50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary flex items-center gap-1.5 text-up">
                <ShieldCheck size={12} /> Take Profit (%)
              </label>
              <input disabled={isRunning} type="number" defaultValue="5.0" className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent disabled:opacity-50" />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 pt-5 border-t border-border-subtle">
            <label className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">Max Daily Drawdown Stop (%)</label>
            <input disabled={isRunning} type="number" defaultValue="10" className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-tx-primary outline-none focus:border-accent disabled:opacity-50" />
            <span className="text-[11px] text-tx-tertiary mt-1">Bot will automatically pause if daily equity drops by this percentage.</span>
          </div>
        </div>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className={clsx(
            "w-full py-3.5 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-md",
            isRunning 
              ? "bg-page border border-border-strong text-tx-primary hover:bg-hover shadow-none" 
              : "bg-accent text-white hover:opacity-90"
          )}
        >
          {isRunning ? (
            'STOP BOT'
          ) : (
            <><Play size={16} fill="currentColor" /> DEPLOY & START BOT</>
          )}
        </button>
      </div>
    </div>
  );
}
