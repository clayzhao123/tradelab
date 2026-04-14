import { useEffect, useMemo, useState } from "react";
import { LeftSidebar } from '../components/LeftSidebar';
import { MainArea } from '../components/MainArea';
import { useData } from '../contexts/DataContext';
import { toUserErrorMessage } from "../../shared/api/client";

interface Coin {
  symbol: string;
  price: number | null;
  change: number | null;
  score: number;
  rank: number;
}

export function Dashboard() {
  const {
    marketDataProvider,
    quotes,
    scanResults,
    accountSummary,
    klines,
    loadKlines,
    runScan,
    watchlist,
    watchlistUpdatedAt,
    watchlistNextRefreshAt,
    dashboardRefreshIntervalMs,
  } = useData();
  const [activeSymbol, setActiveSymbol] = useState("BTC");
  const [timeframe, setTimeframe] = useState("15m");
  const [dismissedRiskKey, setDismissedRiskKey] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const coins: Coin[] = useMemo(() => {
    const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const scanMap = new Map(scanResults.map((result) => [result.symbol, result]));
    const universe = watchlist.length > 0
      ? watchlist.slice(0, 100).map((item) => ({
        symbol: item.symbol,
        rank: item.rank,
      }))
      : quotes.map((quote, index) => ({ symbol: quote.symbol, rank: index + 1 }));

    return universe.map((item) => {
      const q = quoteMap.get(item.symbol);
      const scanResult = scanMap.get(item.symbol);
      return {
        symbol: item.symbol.replace("USDT", ""),
        price: q?.last ?? null,
        change: q?.change24hPct ?? null,
        score: scanResult?.score != null ? Math.round(scanResult.score * 100) : 0,
        rank: item.rank,
      };
    });
  }, [quotes, scanResults, watchlist]);

  const riskEvent = useMemo(() => {
    if (!accountSummary) return null;
    if (accountSummary.drawdownPct > 0.05) {
      return `Max Drawdown triggered: -${(accountSummary.drawdownPct * 100).toFixed(1)}% (Account Protection)`;
    }
    return null;
  }, [accountSummary]);
  const effectiveSymbol = useMemo(() => {
    const currentExists = coins.some((coin) => coin.symbol === activeSymbol);
    if (currentExists) {
      return activeSymbol;
    }
    return coins[0]?.symbol ?? activeSymbol;
  }, [coins, activeSymbol]);

  const visibleRiskEvent = riskEvent && dismissedRiskKey !== riskEvent ? riskEvent : null;

  useEffect(() => {
    if (!effectiveSymbol) {
      return;
    }
    void loadKlines(effectiveSymbol, timeframe, 120);
  }, [effectiveSymbol, timeframe, loadKlines]);

  const handleRunScan = async (): Promise<void> => {
    const scanUniverse = coins.map((coin) => `${coin.symbol}USDT`).slice(0, 30);
    if (scanUniverse.length === 0) {
      return;
    }
    setScanError(null);
    try {
      await runScan(scanUniverse, timeframe);
    } catch (error) {
      setScanError(toUserErrorMessage(error));
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {scanError && (
        <div className="mx-4 mt-4 rounded-lg border border-down/30 bg-down-bg px-3 py-2 text-[12px] text-down flex items-center justify-between">
          <span>{scanError}</span>
          <button
            onClick={() => {
              void handleRunScan();
            }}
            className="px-2 py-1 text-[11px] rounded border border-down/30 hover:bg-down/10"
          >
            Retry
          </button>
        </div>
      )}
      <div className="w-full h-full flex">
      <LeftSidebar
        coins={coins}
        activeSymbol={effectiveSymbol}
        onSelectCoin={setActiveSymbol}
      />

      <MainArea
        activeSymbol={effectiveSymbol}
        activeTimeframe={timeframe}
        watchlistUpdatedAt={watchlistUpdatedAt}
        watchlistNextRefreshAt={watchlistNextRefreshAt}
        marketDataProvider={marketDataProvider}
        dashboardRefreshIntervalMs={dashboardRefreshIntervalMs}
        riskEvent={visibleRiskEvent}
        onDismissRisk={() => setDismissedRiskKey(riskEvent)}
        onSelectTimeframe={setTimeframe}
        onRunScan={handleRunScan}
        klines={klines}
        scanResults={scanResults}
      />
      </div>
    </div>
  );
}
