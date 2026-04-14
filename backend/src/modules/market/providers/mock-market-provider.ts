import type { MemoryDb } from "../../../db/memory-db.js";
import type { Kline, Quote } from "../../../domain/types.js";
import type { GetKlinesInput, MarketProvider } from "./market-provider.js";
import { buildFallbackMarketCapWatchlist, type MarketCapWatchlistEntry } from "../top-usdt-watchlist.js";

const mutateQuote = (quote: Quote): Quote => {
  const drift = (Math.random() - 0.5) * 0.0025;
  const nextLast = Math.max(0.0001, quote.last * (1 + drift));
  const spread = Math.max(quote.last * 0.00005, 0.01);
  return {
    ...quote,
    last: Number(nextLast.toFixed(8)),
    bid: Number((nextLast - spread).toFixed(8)),
    ask: Number((nextLast + spread).toFixed(8)),
    change24hPct: Number((quote.change24hPct + drift * 100).toFixed(4)),
    updatedAt: new Date().toISOString(),
  };
};

const KNOWN_PRICE_ANCHOR: Record<string, number> = {
  BTCUSDT: 69000,
  ETHUSDT: 3600,
  XRPUSDT: 0.75,
  BNBUSDT: 610,
  SOLUSDT: 155,
  DOGEUSDT: 0.18,
  ADAUSDT: 0.65,
  AVAXUSDT: 38,
  LINKUSDT: 19,
  DOTUSDT: 11,
  LTCUSDT: 90,
  BCHUSDT: 520,
  UNIUSDT: 12,
};

const hashOf = (input: string): number =>
  [...input].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0) >>> 0;

const normalizeSymbol = (symbol: string): string => symbol.trim().toUpperCase();

const normalizeTimeframe = (timeframe: string): string => {
  const raw = timeframe.trim();
  if (!raw) return "15m";
  const unit = raw.at(-1);
  const value = raw.slice(0, -1);
  if (!unit || Number.isNaN(Number(value))) {
    return "15m";
  }
  if (unit === "M") {
    return `${value}M`;
  }
  return `${value}${unit.toLowerCase()}`;
};

const timeframeToMs = (timeframe: string): number => {
  const normalized = normalizeTimeframe(timeframe);
  const match = normalized.match(/^(\d+)([mhdwyM])$/);
  if (!match) {
    return 15 * 60 * 1000;
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const map: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
    M: 30 * 24 * 60 * 60 * 1000,
  };
  return amount * (map[unit] ?? 15 * 60 * 1000);
};

const syntheticQuote = (symbol: string, rankHint: number | null): Quote => {
  const hash = hashOf(symbol);
  const now = new Date().toISOString();
  const anchored = KNOWN_PRICE_ANCHOR[symbol];
  const scale = Math.pow(10, (hash % 6) - 2);
  const randomBase = (8 + (hash % 500) / 10) * scale;
  const last = Number((anchored ?? randomBase).toFixed(8));
  const spread = Math.max(last * 0.00006, 0.00001);
  const rankFactor = rankHint != null ? Math.max(0.05, (120 - rankHint) / 120) : 0.2;
  const volume24h = Number((Math.max(1_500_000, last * 40_000 * (1 + rankFactor * 8))).toFixed(2));
  return {
    symbol,
    bid: Number((last - spread).toFixed(8)),
    ask: Number((last + spread).toFixed(8)),
    last,
    change24hPct: Number((((hash % 1600) - 800) / 100).toFixed(4)),
    volume24h,
    updatedAt: now,
  };
};

const syntheticKlines = (input: {
  symbol: string;
  timeframe: string;
  limit: number;
  anchorPrice: number;
  volume24h: number;
}): Kline[] => {
  const stepMs = timeframeToMs(input.timeframe);
  const nowMs = Date.now();
  const hash = hashOf(`${input.symbol}:${input.timeframe}`);
  const driftBase = ((hash % 500) - 250) / 250_000;
  const noiseScale = 0.004 + ((hash % 13) / 1000);
  const volumeAnchor = Math.max(1, input.volume24h / 96);
  let prevClose = input.anchorPrice;
  const rows: Kline[] = [];

  for (let i = input.limit - 1; i >= 0; i -= 1) {
    const closeTimeMs = nowMs - i * stepMs;
    const openTimeMs = closeTimeMs - stepMs;
    const wave = Math.sin((closeTimeMs / stepMs + hash) * 0.17) * noiseScale;
    const randomKick = (Math.sin((closeTimeMs + hash) * 0.0000017) + Math.cos((closeTimeMs - hash) * 0.0000013)) * 0.0014;
    const ret = driftBase + wave + randomKick;
    const nextClose = Math.max(0.0000001, prevClose * (1 + ret));
    const open = prevClose;
    const close = nextClose;
    const wick = Math.abs(ret) * 1.7 + 0.0015;
    const high = Math.max(open, close) * (1 + wick);
    const low = Math.min(open, close) * (1 - wick);
    const volume = volumeAnchor * (1 + Math.abs(ret) * 35 + ((hash + i) % 7) * 0.03);
    const trades = Math.max(20, Math.round(volume / Math.max(0.0001, input.anchorPrice * 0.003)));
    rows.push({
      symbol: input.symbol,
      timeframe: input.timeframe,
      openTime: new Date(openTimeMs).toISOString(),
      closeTime: new Date(closeTimeMs).toISOString(),
      open: Number(open.toFixed(8)),
      high: Number(high.toFixed(8)),
      low: Number(low.toFixed(8)),
      close: Number(close.toFixed(8)),
      volume: Number(volume.toFixed(8)),
      trades,
    });
    prevClose = close;
  }

  return rows;
};

export class MockMarketProvider implements MarketProvider {
  readonly name = "mock" as const;
  readonly #fallbackWatchlist: MarketCapWatchlistEntry[];

  constructor(private readonly db: MemoryDb) {
    this.#fallbackWatchlist = buildFallbackMarketCapWatchlist(100);
  }

  async getQuotes(symbols?: string[]): Promise<Quote[]> {
    return this.db.withTransaction(async (tx) => {
      const normalizedSymbols = symbols?.map(normalizeSymbol);
      const source = tx.listQuotes();
      const sourceMap = new Map(source.map((quote) => [quote.symbol, quote]));

      const missingSymbols = normalizedSymbols
        ? normalizedSymbols.filter((symbol) => !sourceMap.has(symbol))
        : [];
      if (missingSymbols.length > 0) {
        const rankedMap = new Map(this.#fallbackWatchlist.map((item) => [item.symbol, item.rank]));
        const generated = missingSymbols.map((symbol) => syntheticQuote(symbol, rankedMap.get(symbol) ?? null));
        tx.setQuotes(generated);
      }

      const seededSource =
        normalizedSymbols && normalizedSymbols.length > 0
          ? tx.listQuotes(normalizedSymbols)
          : tx.listQuotes();
      const baseline = seededSource.length > 0 ? seededSource : this.#fallbackWatchlist.slice(0, 32).map((item) => syntheticQuote(item.symbol, item.rank));
      if (seededSource.length === 0) {
        tx.setQuotes(baseline);
      }

      const refreshedSource = normalizedSymbols && normalizedSymbols.length > 0 ? tx.listQuotes(normalizedSymbols) : tx.listQuotes();
      const target = refreshedSource.length > 0 ? refreshedSource : baseline;
      const updated = target.map(mutateQuote);
      tx.setQuotes(updated);
      return normalizedSymbols && normalizedSymbols.length > 0 ? tx.listQuotes(normalizedSymbols) : tx.listQuotes();
    });
  }

  async getKlines(input: GetKlinesInput): Promise<Kline[]> {
    const symbol = normalizeSymbol(input.symbol);
    const timeframe = normalizeTimeframe(input.timeframe);
    const limit = Math.max(1, Math.min(1500, Math.floor(input.limit)));
    return this.db.withTransaction(async (tx) => {
      const quote = tx.listQuotes([symbol])[0] ?? syntheticQuote(symbol, null);
      if (!tx.listQuotes([symbol]).length) {
        tx.setQuotes([quote]);
      }
      const generated = syntheticKlines({
        symbol,
        timeframe,
        limit,
        anchorPrice: quote.last,
        volume24h: quote.volume24h,
      });
      tx.upsertKlines(generated);
      return tx.listKlines({ symbol, timeframe, limit });
    });
  }

  async getTopUsdtSymbolsByMarketCap(limit: number): Promise<MarketCapWatchlistEntry[]> {
    const normalizedLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    return this.#fallbackWatchlist.slice(0, normalizedLimit);
  }
}
