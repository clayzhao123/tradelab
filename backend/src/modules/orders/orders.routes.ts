import type { FastifyInstance } from "fastify";
import { errorResponseSchema, fillSchema, orderSchema } from "../../shared/schemas.js";
import type { OrdersService } from "./orders.service.js";
import { notFoundError } from "../../shared/app-error.js";

type RegisterOrdersRoutesOptions = {
  service: OrdersService;
};

export const registerOrdersRoutes = async (
  app: FastifyInstance,
  options: RegisterOrdersRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/orders",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["new", "open", "partial", "filled", "cancelled", "rejected"],
            },
            symbol: { type: "string" },
            limit: { type: "number", minimum: 1, maximum: 500, default: 200 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["orders"],
            properties: {
              orders: { type: "array", items: orderSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { status?: string; symbol?: string; limit?: number };
      const orders = await options.service.listOrders({
        status: query.status as
          | "new"
          | "open"
          | "partial"
          | "filled"
          | "cancelled"
          | "rejected"
          | undefined,
        symbol: query.symbol?.toUpperCase(),
        limit: query.limit ?? 200,
      });
      return { orders };
    },
  );

  app.post(
    "/api/v1/orders",
    {
      schema: {
        body: {
          type: "object",
          required: ["symbol", "side", "type", "quantity"],
          properties: {
            runId: { type: "string" },
            strategyId: { type: "string" },
            symbol: { type: "string", minLength: 2, maxLength: 32 },
            side: { type: "string", enum: ["buy", "sell"] },
            type: { type: "string", enum: ["market", "limit"] },
            quantity: { type: "number", exclusiveMinimum: 0 },
            limitPrice: { type: "number", exclusiveMinimum: 0 },
          },
          additionalProperties: false,
        },
        response: {
          201: {
            type: "object",
            required: ["order", "fill"],
            properties: {
              order: orderSchema,
              fill: {
                anyOf: [{ type: "null" }, fillSchema],
              },
            },
            additionalProperties: false,
          },
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        runId?: string;
        strategyId?: string;
        symbol: string;
        side: "buy" | "sell";
        type: "market" | "limit";
        quantity: number;
        limitPrice?: number;
      };
      const created = await options.service.createOrder({
        runId: body.runId ?? null,
        strategyId: body.strategyId ?? null,
        symbol: body.symbol,
        side: body.side,
        type: body.type,
        quantity: body.quantity,
        limitPrice: body.limitPrice ?? null,
      });
      return reply.code(201).send(created);
    },
  );

  app.delete(
    "/api/v1/orders/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["order"],
            properties: {
              order: orderSchema,
            },
            additionalProperties: false,
          },
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const cancelled = await options.service.cancelOrder(params.id);
      if (!cancelled) {
        throw notFoundError("not_found.order", `Order ${params.id} does not exist`, { orderId: params.id });
      }
      return { order: cancelled };
    },
  );

  app.get(
    "/api/v1/fills",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            orderId: { type: "string" },
            limit: { type: "number", minimum: 1, maximum: 500, default: 200 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["fills"],
            properties: {
              fills: { type: "array", items: fillSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { symbol?: string; orderId?: string; limit?: number };
      const fills = await options.service.listFills({
        symbol: query.symbol?.toUpperCase(),
        orderId: query.orderId,
        limit: query.limit ?? 200,
      });
      return { fills };
    },
  );
};
