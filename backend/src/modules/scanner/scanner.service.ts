import { randomUUID } from "node:crypto";
import type { MemoryDb } from "../../db/memory-db.js";
import type { Kline, ScanResult, ScanRun } from "../../domain/types.js";
import type { MarketService } from "../market/market.service.js";

type RunScanInput = {
  symbols: string[];
  timeframe: string;
};

export class ScannerService {
  constructor(
    private readonly db: MemoryDb,
    private readonly marketService: MarketService,
  ) {}

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private std(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private ema(values: number[], period: number): number {
    if (values.length === 0) return 0;
    const alpha = 2 / (period + 1);
    let result = values[0];
    for (let i = 1; i < values.length; i += 1) {
      result = alpha * values[i] + (1 - alpha) * result;
    }
    return result;
  }

  private buildFactors(input: {
    closes: number[];
    volumes: number[];
    change24hPct: number;
    volume24h: number;
  }): ScanResult["factors"] {
    const closes = input.closes;
    const volumes = input.volumes;
    const lastClose = closes[closes.length - 1] ?? 0;

    const close5 = closes[Math.max(0, closes.length - 6)] ?? lastClose;
    const close20 = closes[Math.max(0, closes.length - 21)] ?? lastClose;
    const ret5 = close5 > 0 ? lastClose / close5 - 1 : 0;
    const ret20 = close20 > 0 ? lastClose / close20 - 1 : 0;
    const emaFast = this.ema(closes.slice(-40), 12);
    const emaSlow = this.ema(closes.slice(-60), 26);
    const trendEdge = lastClose > 0 ? (emaFast - emaSlow) / lastClose : 0;
    const change24hNorm = this.clamp01(0.5 + input.change24hPct / 15);
    const momentum = this.clamp01(0.25 + ret5 * 7.5 + ret20 * 4.5 + trendEdge * 28 + change24hNorm * 0.3);

    const lastVolume = volumes[volumes.length - 1] ?? 0;
    const avgVolume = this.mean(volumes.slice(-30));
    const volumeRatio = avgVolume > 0 ? lastVolume / avgVolume : 1;
    const volume24hNorm = this.clamp01(Math.log10(Math.max(1, input.volume24h)) / 11.2);
    const volume = this.clamp01(0.45 + (volumeRatio - 1) * 0.35 + volume24hNorm * 0.4);

    const returns = closes.slice(1).map((value, i) => {
      const prev = closes[i];
      if (prev <= 0) return 0;
      return value / prev - 1;
    });
    const realizedVol = this.std(returns.slice(-30));
    const volatilityPenalty = this.clamp01(realizedVol / 0.05);
    const volatility = Number((1 - volatilityPenalty).toFixed(4));

    const liquidity = this.clamp01(Math.log10(Math.max(1, input.volume24h)) / 11.4);

    return {
      momentum: Number(momentum.toFixed(4)),
      volume: Number(volume.toFixed(4)),
      volatility,
      liquidity: Number(liquidity.toFixed(4)),
    };
  }

  async runScan(input: RunScanInput): Promise<{ scanRun: ScanRun; results: ScanResult[] }> {
    const symbols = [...new Set(input.symbols.map((symbol) => symbol.toUpperCase()))];
    return this.db.withTransaction(async (tx) => {
      const scanRun = tx.createScanRun({
        timeframe: input.timeframe,
        requestedSymbols: symbols,
      });

      try {
        const quotes = await this.marketService.getQuotes(symbols);
        const timestamp = new Date().toISOString();
        const klineMap = new Map(
          await Promise.all(
            quotes.map(async (quote) => {
              try {
                const klines = await this.marketService.getKlines({
                  symbol: quote.symbol,
                  timeframe: input.timeframe,
                  limit: 120,
                });
                return [quote.symbol, klines] as const;
              } catch {
                return [quote.symbol, [] as Kline[]] as const;
              }
            }),
          ),
        );

        const results = quotes
          .map((quote) => {
            const klines = klineMap.get(quote.symbol) ?? [];
            const ordered = [...klines].sort((a, b) => a.openTime.localeCompare(b.openTime));
            const closes = ordered.map((row) => row.close);
            const volumes = ordered.map((row) => row.volume);
            const factors = this.buildFactors({
              closes: closes.length > 0 ? closes : [quote.last],
              volumes: volumes.length > 0 ? volumes : [quote.volume24h / 24],
              change24hPct: quote.change24hPct,
              volume24h: quote.volume24h,
            });
            const score = this.clamp01(
              factors.momentum * 0.38 +
                factors.volume * 0.24 +
                factors.volatility * 0.18 +
                factors.liquidity * 0.2,
            );
            const signal: "long" | "short" | "neutral" =
              score >= 0.62 ? "long" : score <= 0.38 ? "short" : "neutral";
            const result: ScanResult = {
              id: randomUUID(),
              scanRunId: scanRun.id,
              symbol: quote.symbol,
              signal,
              score: Number(score.toFixed(4)),
              factors,
              basis: [
                "price_momentum_5_20",
                "ema_trend_12_26",
                "volume_regime",
                "realized_volatility_penalty",
                "liquidity_24h_volume",
              ],
              lastPrice: quote.last,
              change24hPct: quote.change24hPct,
              volume24h: quote.volume24h,
              createdAt: timestamp,
            };
            return result;
          })
          .sort((a, b) => b.score - a.score);

        tx.setScanResults(scanRun.id, results);
        const completed = tx.completeScanRun(scanRun.id, "completed");
        return {
          scanRun: completed ?? scanRun,
          results,
        };
      } catch (error) {
        tx.completeScanRun(scanRun.id, "failed", error instanceof Error ? error.message : "scan failed");
        throw error;
      }
    });
  }

  async getLatestResults(limit = 50): Promise<ScanResult[]> {
    return this.db.read((tx) => tx.listLatestScanResults(limit));
  }
}
