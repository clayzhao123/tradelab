import type { FastifyInstance } from "fastify";

export const registerHealthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["status", "service", "timestamp"],
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              timestamp: { type: "string" },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async () => ({
      status: "ok",
      service: "v1-backend",
      timestamp: new Date().toISOString(),
    }),
  );
};

