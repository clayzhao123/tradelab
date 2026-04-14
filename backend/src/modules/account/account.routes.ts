import type { FastifyInstance } from "fastify";
import type { AccountService } from "./account.service.js";
import { accountSummarySchema, equityPointSchema, positionSchema } from "../../shared/schemas.js";

type RegisterAccountRoutesOptions = {
  service: AccountService;
};

export const registerAccountRoutes = async (
  app: FastifyInstance,
  options: RegisterAccountRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/account/summary",
    {
      schema: {
        response: {
          200: accountSummarySchema,
        },
      },
    },
    async () => options.service.getSummary(),
  );

  app.get(
    "/api/v1/account/equity",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 500, default: 100 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["points"],
            properties: {
              points: { type: "array", items: equityPointSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { limit?: number };
      return {
        points: await options.service.getEquityCurve(query.limit ?? 100),
      };
    },
  );

  app.get(
    "/api/v1/account/positions",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["positions"],
            properties: {
              positions: { type: "array", items: positionSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async () => ({
      positions: await options.service.getPositions(),
    }),
  );
};
