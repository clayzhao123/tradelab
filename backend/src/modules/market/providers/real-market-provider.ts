import type { FastifyBaseLogger } from "fastify";
import type { Kline, Quote } from "../../../domain/types.js";
import type { GetKlinesInput, MarketProvider } from "./market-provider.js";
import { MockMarketProvider } from "./mock-market-provider.js";
import { buildFallbackMarketCapWatchlist, type MarketCapWatchlistEntry } from "../top-usdt-watchlist.js";

type BinanceTicker24h = {
  symbol: string;
  bidPrice: string;
  askPrice: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  closeTime: number;
};

type CoingeckoMarket = {
  symbol: string;
  market_cap: number;
};

const BINANCE_BASE = "https://api.binance.com";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const TICKER_CACHE_TTL_MS = 5_000;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function normalizeTimeframe(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "15m";
  }
  const unit = trimmed.at(-1);
  const value = trimmed.slice(0, -1);
  if (!value || Number.isNaN(Number(value)) || !unit) {
    return "15m";
  }
  if (unit === "M") {
    return `${value}M`;
  }
  return `${value}${unit.toLowerCase()}`;
}

function mapToBinanceInterval(timeframe: string): string {
  const normalized = normalizeTimeframe(timeframe);
  if (normalized === "1y") return "1M";
  return normalized;
}

export class RealMarketProvider implements MarketProvider {
  readonly name = "real" as const;
  #tickerCache: { updatedAtMs: number; rows: BinanceTicker24h[] } | null = null;
  #quoteCache = new Map<string, Quote>();
  #klineCache = new Map<string, Kline[]>();
  #watchlistCache: MarketCapWatchlistEntry[] | null = null;

  constructor(
    private readonly fallback: MockMarketProvider,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    return (await response.json()) as T;
  }

  private async getTicker24hRows(): Promise<BinanceTicker24h[]> {
    const now = Date.now();
    if (this.#tickerCache && now - this.#tickerCache.updatedAtMs <= TICKER_CACHE_TTL_MS) {
      return this.#tickerCache.rows;
    }
    const rows = await this.fetchJson<BinanceTicker24h[]>(`${BINANCE_BASE}/api/v3/ticker/24hr`);
    this.#tickerCache = {
      updatedAtMs: now,
      rows,
    };
    return rows;
  }

  private toQuote(row: BinanceTicker24h): Quote {
    return {
      symbol: normalizeSymbol(row.symbol),
      bid: Number(row.bidPrice),
      ask: Number(row.askPrice),
      last: Number(row.lastPrice),
      change24hPct: Number(row.priceChangePercent),
      volume24h: Number(row.quoteVolume || row.volume),
      updatedAt: new Date(row.closeTime).toISOString(),
    };
  }

  async getQuotes(symbols?: string[]): Promise<Quote[]> {
    const requested = symbols?.map(normalizeSymbol);
    const requestedSet = requested ? new Set(requested) : null;
    try {
      const rows = await this.getTicker24hRows();
      const filtered = requestedSet
        ? rows.filter((row) => requestedSet.has(normalizeSymbol(row.symbol)))
        : rows.filter((row) => row.symbol.endsWith("USDT"));
      const quotes = filtered.map((row) => this.toQuote(row));
      if (quotes.length === 0) {
        throw new Error("empty_quotes");
      }
      for (const quote of quotes) {
        this.#quoteCache.set(quote.symbol, quote);
      }
      return quotes.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } catch (error) {
      const cached = requested
        ? requested
            .map((symbol) => this.#quoteCache.get(symbol) ?? null)
            .filter((row): row is Quote => row != null)
        : [...this.#quoteCache.values()];
      if (cached.length > 0) {
        this.logger.warn(
          {
            err: error,
            symbols,
            cacheSize: cached.length,
          },
          "real provider quotes failed; serving cached real quotes",
        );
        return cached.sort((a, b) => a.symbol.localeCompare(b.symbol));
      }
      this.logger.warn(
        {
          err: error,
          symbols,
        },
        "real provider quotes failed; serving fallback mock quotes",
      );
      return this.fallback.getQuotes(symbols);
    }
  }

  async getKlines(input: GetKlinesInput): Promise<Kline[]> {
    const symbol = normalizeSymbol(input.symbol);
    const timeframe = normalizeTimeframe(input.timeframe);
    const interval = mapToBinanceInterval(input.timeframe);
    const limit = Math.max(1, Math.min(1000, Math.floor(input.limit)));
    const cacheKey = `${symbol}|${timeframe}`;
    try {
      const rows = await this.fetchJson<
        Array<[number, string, string, string, string, string, number, string, number, string, string, string]>
      >(
        `${BINANCE_BASE}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
      );
      const klines: Kline[] = rows.map((row) => ({
        symbol,
        timeframe,
        openTime: new Date(row[0]).toISOString(),
        closeTime: new Date(row[6]).toISOString(),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
        trades: Number(row[8]),
      }));
      if (klines.length === 0) {
        throw new Error("empty_klines");
      }
      this.#klineCache.set(cacheKey, klines);
      return klines;
    } catch (error) {
      const cached = this.#klineCache.get(cacheKey);
      if (cached && cached.length > 0) {
        this.logger.warn(
          {
            err: error,
            input,
            cacheSize: cached.length,
          },
          "real provider klines failed; serving cached real klines",
        );
        return cached.slice(-limit);
      }
      this.logger.warn(
        {
          err: error,
          input,
        },
        "real provider klines failed; serving fallback mock klines",
      );
      return this.fallback.getKlines(input);
    }
  }

  async getTopUsdtSymbolsByMarketCap(limit: number): Promise<MarketCapWatchlistEntry[]> {
    const normalizedLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    try {
      const [marketsPage1, marketsPage2, tickerRows] = await Promise.all([
        this.fetchJson<CoingeckoMarket[]>(
          `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`,
        ),
        this.fetchJson<CoingeckoMarket[]>(
          `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false`,
        ),
        this.getTicker24hRows(),
      ]);
      const tradableUsdtSet = new Set(
        tickerRows
          .map((row) => normalizeSymbol(row.symbol))
          .filter((symbol) => symbol.endsWith("USDT")),
      );
      const seen = new Set<string>();
      const ranked: MarketCapWatchlistEntry[] = [];

      for (const market of [...marketsPage1, ...marketsPage2]) {
        const symbol = `${market.symbol.toUpperCase()}USDT`;
        if (!tradableUsdtSet.has(symbol) || seen.has(symbol)) {
          continue;
        }
        seen.add(symbol);
        ranked.push({
          symbol,
          rank: ranked.length + 1,
          marketCapUsd: Number((market.market_cap ?? 0).toFixed(2)),
        });
        if (ranked.length >= normalizedLimit) {
          break;
        }
      }

      if (ranked.length < normalizedLimit) {
        const candidates = tickerRows
          .filter((row) => row.symbol.endsWith("USDT") && !seen.has(normalizeSymbol(row.symbol)))
          .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
        for (const row of candidates) {
          const symbol = normalizeSymbol(row.symbol);
          seen.add(symbol);
          ranked.push({
            symbol,
            rank: ranked.length + 1,
            marketCapUsd: Number(Math.max(0, Number(row.quoteVolume)).toFixed(2)),
          });
          if (ranked.length >= normalizedLimit) {
            break;
          }
        }
      }

      if (ranked.length === 0) {
        throw new Error("empty_watchlist");
      }

      this.#watchlistCache = ranked;
      return ranked.slice(0, normalizedLimit);
    } catch (error) {
      try {
        const tickerRows = await this.getTicker24hRows();
        const rankedByVolume = tickerRows
          .filter((row) => normalizeSymbol(row.symbol).endsWith("USDT"))
          .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
          .slice(0, normalizedLimit)
          .map((row, index) => ({
            symbol: normalizeSymbol(row.symbol),
            rank: index + 1,
            marketCapUsd: Number(Math.max(0, Number(row.quoteVolume)).toFixed(2)),
          }));
        if (rankedByVolume.length > 0) {
          this.#watchlistCache = rankedByVolume;
          this.logger.warn(
            { err: error, limit: normalizedLimit, recoveredBy: "binance_quote_volume" },
            "real provider market-cap watchlist failed; serving Binance-volume watchlist",
          );
          return rankedByVolume;
        }
      } catch (secondaryError) {
        this.logger.warn(
          { err: secondaryError, limit: normalizedLimit },
          "binance-volume watchlist recovery failed",
        );
      }

      if (this.#watchlistCache && this.#watchlistCache.length > 0) {
        this.logger.warn(
          { err: error, limit: normalizedLimit, cacheSize: this.#watchlistCache.length },
          "real provider watchlist failed; serving cached real watchlist",
        );
        return this.#watchlistCache.slice(0, normalizedLimit);
      }
      this.logger.warn(
        { err: error, limit: normalizedLimit },
        "real provider watchlist failed; serving fallback watchlist",
      );
      return buildFallbackMarketCapWatchlist(normalizedLimit);
    }
  }
}
