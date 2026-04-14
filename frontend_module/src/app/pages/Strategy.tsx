import React, { useState } from 'react';
import { Bot, Plus, X, Zap, ChevronRight, Activity, ArrowRightLeft, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';

const BASE_INDICATORS = [
  { id: 'rsi', name: 'RSI', desc: 'Relative Strength Index', type: 'momentum' },
  { id: 'macd', name: 'MACD', desc: 'Moving Average Convergence', type: 'trend' },
  { id: 'bb', name: 'Bollinger Bands', desc: 'Volatility Bands', type: 'volatility' },
  { id: 'ema', name: 'EMA Cross', desc: 'Exponential Moving Averages', type: 'trend' },
  { id: 'atr', name: 'ATR', desc: 'Average True Range', type: 'volatility' },
  { id: 'stoch', name: 'Stochastic', desc: 'Stochastic Oscillator', type: 'momentum' },
  { id: 'vol', name: 'Volume Profile', desc: 'Volume by Price', type: 'volume' },
  { id: 'obv', name: 'OBV', desc: 'On-Balance Volume', type: 'volume' },
];

export function Strategy() {
  const [selectedPool, setSelectedPool] = useState<typeof BASE_INDICATORS>([]);
  const [isFusing, setIsFusing] = useState(false);
  const [fusedResult, setFusedResult] = useState<any>(null);

  const toggleIndicator = (indicator: typeof BASE_INDICATORS[0]) => {
    if (selectedPool.find(i => i.id === indicator.id)) {
      setSelectedPool(selectedPool.filter(i => i.id !== indicator.id));
    } else {
      if (selectedPool.length >= 5) return; // Max 5
      setSelectedPool([...selectedPool, indicator]);
    }
  };

  const handleFusion = () => {
    if (selectedPool.length < 2) return;
    setIsFusing(true);
    setFusedResult(null);
    
    // Mock AI delay
    setTimeout(() => {
      setIsFusing(false);
      setFusedResult({
        name: `${selectedPool[0].name}-${selectedPool[1].name} Alpha Matrix`,
        score: 92,
        components: selectedPool.map(i => i.name).join(' + '),
        logic: 'Combines momentum divergence with volatility compression to identify high-probability breakout setups before volume expansion.'
      });
      setSelectedPool([]);
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-[1200px] mx-auto overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-[20px] font-medium text-tx-primary mb-1">Indicator Fusion Lab</h1>
        <p className="text-[13px] text-tx-secondary">Select multiple base indicators and use AI to fuse them into a high-performance custom strategy.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[400px]">
        {/* Left: Pool */}
        <div className="col-span-5 flex flex-col bg-surface border border-border-subtle rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary">Base Indicators</h2>
            <span className="text-[11px] text-tx-tertiary">{selectedPool.length}/5 Selected</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {BASE_INDICATORS.map(ind => {
              const isSelected = selectedPool.some(i => i.id === ind.id);
              return (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind)}
                  disabled={!isSelected && selectedPool.length >= 5}
                  className={clsx(
                    "flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-200",
                    isSelected 
                      ? "bg-accent-bg border-accent text-accent shadow-sm" 
                      : "bg-elevated border-border-subtle hover:border-border-strong text-tx-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div>
                    <div className={clsx("text-[13px] font-medium", isSelected ? "text-accent" : "text-tx-primary")}>
                      {ind.name}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">{ind.desc}</div>
                  </div>
                  {isSelected ? <X size={16} /> : <Plus size={16} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: Arrow/Logic */}
        <div className="col-span-2 flex flex-col items-center justify-center relative">
           <div className="w-full h-[1px] bg-border-subtle absolute top-1/2 -z-10" />
           <div className="bg-page p-2">
              <ArrowRightLeft size={24} className="text-tx-tertiary" />
           </div>
        </div>

        {/* Right: Fusion Chamber */}
        <div className="col-span-5 flex flex-col gap-4">
          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm min-h-[200px] flex flex-col">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-tx-tertiary mb-4">Fusion Chamber</h2>
            
            {selectedPool.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-tx-tertiary">
                <FlaskConical size={32} className="mb-2 opacity-50" />
                <p className="text-[12px]">Select indicators to begin</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-2">
                {selectedPool.map(ind => (
                  <div key={`sel-${ind.id}`} className="flex items-center gap-2 text-[13px] font-medium px-3 py-2 bg-elevated rounded border border-border-subtle">
                    <Activity size={14} className="text-accent" />
                    {ind.name}
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={handleFusion}
              disabled={selectedPool.length < 2 || isFusing}
              className={clsx(
                "mt-6 w-full py-3 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-all duration-200",
                selectedPool.length >= 2 
                  ? "bg-accent text-white hover:opacity-90 shadow-md" 
                  : "bg-border-subtle text-tx-tertiary cursor-not-allowed"
              )}
            >
              {isFusing ? (
                <>
                  <Bot size={16} className="animate-pulse" />
                  AI FUSING...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  FUSE STRATEGY
                </>
              )}
            </button>
          </div>

          {/* Results Area */}
          {fusedResult && (
            <div className="bg-up-bg border border-up/20 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-start justify-between mb-3">
                 <div>
                   <div className="text-[10px] font-bold text-up tracking-wider uppercase mb-1">New Strategy Generated</div>
                   <h3 className="text-[16px] font-medium text-tx-primary">{fusedResult.name}</h3>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-up/20 text-up flex items-center justify-center font-mono font-bold text-[14px]">
                   {fusedResult.score}
                 </div>
               </div>
               <div className="text-[12px] text-tx-secondary bg-surface/50 p-3 rounded border border-border-subtle/50 mb-3">
                 <strong className="text-tx-primary block mb-1">Components:</strong>
                 {fusedResult.components}
               </div>
               <p className="text-[13px] leading-relaxed text-tx-secondary">
                 {fusedResult.logic}
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
