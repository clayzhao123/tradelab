import React, { useState } from 'react';
import { LeftSidebar, Coin } from '../components/LeftSidebar';
import { MainArea } from '../components/MainArea';

const MOCK_COINS: Coin[] = [
  { symbol: 'BTC', price: 43280.50, change: 2.34, score: 85 },
  { symbol: 'ETH', price: 2314.20, change: 1.12, score: 72 },
  { symbol: 'SOL', price: 108.45, change: -0.54, score: 65 },
  { symbol: 'BNB', price: 312.80, change: 0.21, score: 55 },
  { symbol: 'DOGE', price: 0.082, change: -2.15, score: 42 },
  { symbol: 'AVAX', price: 35.60, change: 5.40, score: 88 },
  { symbol: 'LINK', price: 14.20, change: 1.80, score: 70 },
  { symbol: 'DOT', price: 6.85, change: -1.20, score: 48 },
];

export function Dashboard() {
  const [activeSymbol, setActiveSymbol] = useState('BTC');
  const [riskEvent, setRiskEvent] = useState<string | null>('Max Drawdown triggered: -8.2% (Account Protection)');

  return (
    <div className="w-full h-full flex">
      <LeftSidebar
        coins={MOCK_COINS}
        activeSymbol={activeSymbol}
        onSelectCoin={setActiveSymbol}
      />

      <MainArea
        activeSymbol={activeSymbol}
        riskEvent={riskEvent}
        onDismissRisk={() => setRiskEvent(null)}
      />
    </div>
  );
}
