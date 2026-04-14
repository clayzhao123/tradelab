import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, TrendingUp, TrendingDown, Target, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';

const mockEquityData = Array.from({ length: 60 }).map((_, i) => {
  const day = Math.floor(i / 30);
  const month = (i % 30) + 1;
  return {
    date: `Day ${i + 1}`,
    value: 10000 + (i * 50) + (Math.sin(i/3) * 400) + (Math.random() * 200)
  };
});

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOGE/USDT'];
const STRATEGIES = ['RSI-MACD Alpha Matrix', 'Volatility Breakout V2', 'Trend Following Pro'];

export function Backtest() {
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['BTC/USDT', 'ETH/USDT']);
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [isTesting, setIsTesting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const togglePair = (pair: string) => {
    if (selectedPairs.includes(pair)) {
      setSelectedPairs(selectedPairs.filter(p => p !== pair));
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  const handleRun = () => {
    if (selectedPairs.length === 0) return;
    setIsTesting(true);
    setShowResults(false);
    setTimeout(() => {
      setIsTesting(false);
      setShowResults(true);
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-[1200px] mx-auto overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-medium text-tx-primary mb-1">Backtest Engine</h1>
        <p className="text-[13px] text-tx-secondary">Run historical simulations on your fused strategies across multiple market pairs.</p>
      </div>

      {/* Config Panel */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm mb-6 flex flex-col gap-5">
        <div className="flex gap-6">
          <div className="flex-1">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-tx-tertiary mb-2">Strategy</label>
            <select 
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary outline-none focus:border-accent"
            >
              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-tx-tertiary mb-2">Timeframe</label>
            <select className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-[13px] text-tx-primary outline-none focus:border-accent">
              <option>15m (3 Months)</option>
              <option>1H (1 Year)</option>
              <option>4H (2 Years)</option>
              <option>1D (5 Years)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-tx-tertiary mb-2">Target Pairs</label>
          <div className="flex flex-wrap gap-2">
            {PAIRS.map(pair => (
              <button
                key={pair}
                onClick={() => togglePair(pair)}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors border",
                  selectedPairs.includes(pair)
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-elevated text-tx-secondary border-border-subtle hover:border-border-strong"
                )}
              >
                {pair}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border-subtle">
          <button
            onClick={handleRun}
            disabled={isTesting || selectedPairs.length === 0}
            className="w-40 py-2.5 bg-tx-primary text-page rounded-md text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isTesting ? 'Running Test...' : <><Play size={14} /> Run Backtest</>}
          </button>
        </div>
      </div>

      {/* Results Panel */}
      {showResults && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Total Return" value="+124.5%" isUp icon={TrendingUp} />
            <MetricCard title="Win Rate" value="68.2%" icon={Target} />
            <MetricCard title="Max Drawdown" value="-12.4%" isDown icon={ShieldAlert} />
            <MetricCard title="Total Trades" value="1,432" icon={TrendingUp} neutral />
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-4">Equity Curve (Aggregated)</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockEquityData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--base-color-accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--base-color-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--base-bg-elevated)', border: '1px solid var(--base-border-default)', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--base-color-accent)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
             <h3 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-4">Pair Performance</h3>
             <div className="grid grid-cols-2 gap-4">
               {selectedPairs.map((pair, idx) => (
                 <div key={pair} className="flex items-center justify-between p-3 border border-border-subtle rounded-lg bg-elevated">
                   <div className="font-medium text-[13px]">{pair}</div>
                   <div className={clsx("font-mono text-[13px] font-medium", idx === 0 ? "text-up" : "text-tx-primary")}>
                     {idx === 0 ? '+45.2%' : '+12.1%'}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, isUp, isDown, neutral }: any) {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col justify-between h-[100px]">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-medium uppercase tracking-wider text-tx-tertiary">{title}</span>
        <Icon size={14} className="text-tx-tertiary" />
      </div>
      <div className={clsx(
        "text-[24px] font-mono font-medium",
        isUp && "text-up",
        isDown && "text-down",
        neutral && "text-tx-primary"
      )}>
        {value}
      </div>
    </div>
  );
}
