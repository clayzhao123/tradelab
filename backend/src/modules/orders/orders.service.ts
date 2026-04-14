import type { MemoryDb } from "../../db/memory-db.js";
import type { Fill, Order, Position, Quote } from "../../domain/types.js";
import type { EventHub } from "../ws/event-hub.js";
import type { MarketService } from "../market/market.service.js";
import type { AccountService } from "../account/account.service.js";
import type { RiskService } from "../risk/risk.service.js";
import { AppError, conflictError } from "../../shared/app-error.js";

type CreateOrderInput = {
  runId?: string | null;
  strategyId?: string | null;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  limitPrice?: number | null;
};

const toSignedDelta = (side: "buy" | "sell", quantity: number): number => (side === "buy" ? quantity : -quantity);

const updatePositionFromFill = (
  previous: Position | undefined,
  fill: { side: "buy" | "sell"; quantity: number; price: number; fee: number },
  marketPrice: number,
): Position => {
  const prevQty = previous?.quantity ?? 0;
  const prevAvg = previous?.avgCost ?? 0;
  const prevRealized = previous?.realizedPnl ?? 0;

  const delta = toSignedDelta(fill.side, fill.quantity);
  const nextQty = prevQty + delta;

  let nextAvg = prevAvg;
  let realizedDelta = 0;

  if (prevQty === 0 || Math.sign(prevQty) === Math.sign(delta)) {
    nextAvg = Math.abs(nextQty) === 0 ? 0 : (Math.abs(prevQty) * prevAvg + Math.abs(delta) * fill.price) / Math.abs(nextQty);
  } else {
    const closedQty = Math.min(Math.abs(prevQty), Math.abs(delta));
    realizedDelta = prevQty > 0 ? (fill.price - prevAvg) * closedQty : (prevAvg - fill.price) * closedQty;
    if (Math.abs(nextQty) === 0) {
      nextAvg = 0;
    } else if (Math.sign(nextQty) !== Math.sign(prevQty)) {
      nextAvg = fill.price;
    } else {
      nextAvg = prevAvg;
    }
  }

  const realizedPnl = prevRealized + realizedDelta - fill.fee;
  const marketValue = nextQty * marketPrice;
  const unrealizedPnl = (marketPrice - nextAvg) * nextQty;

  return {
    symbol: previous?.symbol ?? "",
    quantity: Number(nextQty.toFixed(8)),
    avgCost: Number(nextAvg.toFixed(8)),
    marketPrice: Number(marketPrice.toFixed(8)),
    marketValue: Number(marketValue.toFixed(8)),
    unrealizedPnl: Number(unrealizedPnl.toFixed(8)),
    realizedPnl: Number(realizedPnl.toFixed(8)),
    updatedAt: new Date().toISOString(),
  };
};

const estimateOrderPrice = (input: CreateOrderInput, quote: Quote | undefined): number => {
  if (input.type === "limit" && input.limitPrice) {
    return input.limitPrice;
  }
  return quote?.last ?? input.limitPrice ?? 0;
};

export class OrdersService {
  constructor(
    private readonly db: MemoryDb,
    private readonly marketService: MarketService,
    private readonly accountService: AccountService,
    private readonly eventHub: EventHub,
    private readonly riskService: RiskService,
  ) {}

  async listOrders(input?: { status?: Order["status"]; symbol?: string; limit?: number }): Promise<Order[]> {
    return this.db.read((tx) => tx.listOrders(input));
  }

  async listFills(input?: { symbol?: string; orderId?: string; limit?: number }): Promise<Fill[]> {
    return this.db.read((tx) => tx.listFills(input));
  }

  async createOrder(input: CreateOrderInput): Promise<{ order: Order; fill: Fill | null }> {
    const symbol = input.symbol.toUpperCase();
    const [summary, quotes] = await Promise.all([
      this.accountService.getSummary(),
      this.marketService.getQuotes([symbol]),
    ]);
    const activeRun = await this.db.read((tx) => tx.getActiveRun());
    const resolvedRunId = input.runId ?? activeRun?.id ?? null;
    const positions = await this.accountService.getPositions();
    const quote = quotes[0];
    const referencePrice = estimateOrderPrice(input, quote);

    if (!(referencePrice > 0)) {
      throw conflictError("conflict.price_unavailable", "Unable to derive order reference price", {
        symbol,
        orderType: input.type,
      });
    }

    await this.riskService.evaluateOrder({
      runId: resolvedRunId,
      symbol,
      side: input.side,
      quantity: input.quantity,
      referencePrice,
      accountSummary: summary,
      positions,
    });

    const result = await this.db.withTransaction(async (tx) => {
      const order = tx.createOrder({
        runId: resolvedRunId,
        strategyId: input.strategyId ?? null,
        symbol,
        side: input.side,
        type: input.type,
        quantity: input.quantity,
        limitPrice: input.limitPrice ?? null,
      });

      if (input.type === "limit") {
        this.eventHub.publish({
          type: "order.updated",
          ts: new Date().toISOString(),
          data: { order },
        });
        return { order, fill: null };
      }

      const fillPrice = quote?.last ?? referencePrice;
      const estimatedNotional = order.quantity * fillPrice;
      const fee = Number((estimatedNotional * 0.0006).toFixed(8));
      const fill = tx.addFill({
        orderId: order.id,
        runId: order.runId,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: fillPrice,
        fee,
        liquidity: "taker",
        filledAt: new Date().toISOString(),
      });

      const updatedOrder = tx.updateOrder(order.id, {
        status: "filled",
        filledQuantity: order.quantity,
        avgFillPrice: fillPrice,
      });
      if (!updatedOrder) {
        throw new AppError("Failed to update order after fill creation", {
          statusCode: 500,
          category: "internal",
          code: "internal.order_update_failed",
          details: { orderId: order.id },
        });
      }

      const currentPosition = tx.listPositions().find((position) => position.symbol === order.symbol);
      const nextPosition = updatePositionFromFill(
        currentPosition,
        { side: order.side, quantity: fill.quantity, price: fill.price, fee: fill.fee },
        quote?.last ?? fill.price,
      );
      nextPosition.symbol = order.symbol;
      tx.upsertPosition(nextPosition);

      const cashDelta = order.side === "buy" ? -(fill.quantity * fill.price + fee) : fill.quantity * fill.price - fee;
      const nextCash = tx.getCashBalance() + cashDelta;
      if (nextCash < -0.0001) {
        throw conflictError("risk.insufficient_cash", "Order would overdraw account cash balance", {
          orderId: order.id,
          projectedCash: nextCash,
        });
      }
      tx.setCashBalance(Number(nextCash.toFixed(2)));

      this.eventHub.publish({
        type: "order.updated",
        ts: new Date().toISOString(),
        data: { order: updatedOrder },
      });
      this.eventHub.publish({
        type: "fill.created",
        ts: fill.filledAt,
        data: { fill },
      });
      return { order: updatedOrder, fill };
    });

    if (result.fill) {
      const accountSummary = await this.accountService.getSummary("fill");
      this.eventHub.publish({
        type: "account.updated",
        ts: accountSummary.updatedAt,
        data: { accountSummary },
      });
    }
    return result;
  }

  async cancelOrder(orderId: string): Promise<Order | null> {
    return this.db.withTransaction(async (tx) => {
      const order = tx.getOrderById(orderId);
      if (!order) {
        return null;
      }
      if (!["new", "open", "partial"].includes(order.status)) {
        throw conflictError("conflict.order_not_cancellable", "Order is not cancellable in current state", {
          orderId: order.id,
          status: order.status,
        });
      }
      const cancelled = tx.updateOrder(order.id, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      });
      if (!cancelled) {
        return null;
      }

      this.eventHub.publish({
        type: "order.updated",
        ts: new Date().toISOString(),
        data: { order: cancelled },
      });
      return cancelled;
    });
  }
}
