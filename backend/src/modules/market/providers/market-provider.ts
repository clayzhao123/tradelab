import type { Kline, Quote } from "../../../domain/types.js";
import type { MarketCapWatchlistEntry } from "../top-usdt-watchlist.js";

export type GetKlinesInput = {
  symbol: string;
  timeframe: string;
  limit: number;
};

export interface MarketProvider {
  readonly name: "mock" | "real";
  getQuotes(symbols?: string[]): Promise<Quote[]>;
  getKlines(input: GetKlinesInput): Promise<Kline[]>;
  getTopUsdtSymbolsByMarketCap(limit: number): Promise<MarketCapWatchlistEntry[]>;
}
