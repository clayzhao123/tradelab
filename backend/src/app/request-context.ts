import type { FastifyRequest } from "fastify";

type Primitive = string | number | boolean | null;

type RequestContext = {
  requestId: string;
  runId: Primitive;
  orderId: Primitive;
  strategyId: Primitive;
};

const pickEntityId = (container: unknown, key: string): Primitive => {
  if (!container || typeof container !== "object") {
    return null;
  }
  const value = (container as Record<string, unknown>)[key];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return null;
};

export const getRequestContext = (request: FastifyRequest): RequestContext => {
  const body = request.body as Record<string, unknown> | undefined;
  const params = request.params as Record<string, unknown> | undefined;
  const query = request.query as Record<string, unknown> | undefined;

  return {
    requestId: request.id,
    runId: pickEntityId(body, "runId") ?? pickEntityId(params, "runId") ?? pickEntityId(params, "id") ?? pickEntityId(query, "runId"),
    orderId:
      pickEntityId(body, "orderId") ??
      pickEntityId(params, "orderId") ??
      (request.url.includes("/orders/") ? pickEntityId(params, "id") : null),
    strategyId:
      pickEntityId(body, "strategyId") ??
      pickEntityId(params, "strategyId") ??
      (request.url.includes("/strategies/") ? pickEntityId(params, "id") : null),
  };
};
