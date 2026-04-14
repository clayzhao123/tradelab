import type { FastifyInstance } from "fastify";
import type { RunsService } from "./runs.service.js";
import { errorResponseSchema, runSchema } from "../../shared/schemas.js";
import { notFoundError } from "../../shared/app-error.js";

type RegisterRunsRoutesOptions = {
  service: RunsService;
};

export const registerRunsRoutes = async (
  app: FastifyInstance,
  options: RegisterRunsRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/runs",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: runSchema,
          },
        },
      },
    },
    async () => options.service.list(),
  );

  app.post(
    "/api/v1/runs/start",
    {
      schema: {
        body: {
          type: "object",
          required: ["strategyId", "initialCash"],
          properties: {
            strategyId: { type: "string", minLength: 1 },
            initialCash: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
        response: {
          201: runSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { strategyId: string; initialCash: number };
      const run = await options.service.start(body);
      return reply.code(201).send(run);
    },
  );

  app.post(
    "/api/v1/runs/:id/stop",
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
        body: {
          type: "object",
          properties: {
            stopReason: { type: "string", minLength: 1, maxLength: 500 },
          },
          additionalProperties: false,
        },
        response: {
          200: runSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as { stopReason?: string };
      const run = await options.service.stop(params.id, body.stopReason ?? "manual_stop");
      if (!run) {
        throw notFoundError("not_found.run", `Run ${params.id} does not exist`, { runId: params.id });
      }
      return run;
    },
  );
};
