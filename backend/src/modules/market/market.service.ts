import type { Kline, Quote } from "../../domain/types.js";
import type { MarketProvider } from "./providers/market-provider.js";
import type { MarketCapWatchlistEntry } from "./top-usdt-watchlist.js";

type WatchlistCache = {
  dateKey: string;
  updatedAt: string;
  items: MarketCapWatchlistEntry[];
};

export class MarketService {
  #watchlistCache: WatchlistCache | null = null;

  constructor(private readonly provider: MarketProvider) {}

  getProviderName(): "mock" | "real" {
    return this.provider.name;
  }

  async getQuotes(symbols?: string[]): Promise<Quote[]> {
    return this.provider.getQuotes(symbols);
  }

  async getKlines(input: { symbol: string; timeframe: string; limit: number }): Promise<Kline[]> {
    return this.provider.getKlines(input);
  }

  async getTopUsdtWatchlist(limit = 100): Promise<{
    updatedAt: string;
    nextRefreshAt: string;
    items: MarketCapWatchlistEntry[];
  }> {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const normalizedLimit = Math.max(1, Math.min(200, Math.floor(limit)));

    if (!this.#watchlistCache || this.#watchlistCache.dateKey !== dateKey) {
      const items = await this.provider.getTopUsdtSymbolsByMarketCap(Math.max(100, normalizedLimit));
      this.#watchlistCache = {
        dateKey,
        updatedAt: now.toISOString(),
        items,
      };
    }

    const nextRefreshAt = new Date(`${dateKey}T00:00:00.000Z`);
    nextRefreshAt.setUTCDate(nextRefreshAt.getUTCDate() + 1);

    return {
      updatedAt: this.#watchlistCache.updatedAt,
      nextRefreshAt: nextRefreshAt.toISOString(),
      items: this.#watchlistCache.items.slice(0, normalizedLimit),
    };
  }
}
