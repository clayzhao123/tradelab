import type { FastifyInstance } from "fastify";
import { errorResponseSchema } from "../../shared/schemas.js";

export const registerSystemRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    "/api/v1/system/status",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["status", "modules"],
            properties: {
              status: { type: "string" },
              modules: {
                type: "array",
                items: { type: "string" },
              },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async () => ({
      status: "ready",
      modules: [
        "health",
        "system",
        "ai",
        "strategies",
        "runs",
        "account",
        "market",
        "scanner",
        "orders",
        "fills",
        "risk",
        "history",
        "backtest",
        "websocket",
      ],
    }),
  );

  app.post(
    "/api/v1/system/echo",
    {
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", minLength: 1, maxLength: 500 },
            tags: { type: "array", items: { type: "string", minLength: 1, maxLength: 32 }, maxItems: 10 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["message", "tags", "echoedAt"],
            properties: {
              message: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              echoedAt: { type: "string" },
            },
            additionalProperties: false,
          },
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = request.body as { message: string; tags?: string[] };
      return {
        message: body.message,
        tags: body.tags ?? [],
        echoedAt: new Date().toISOString(),
      };
    },
  );
};
