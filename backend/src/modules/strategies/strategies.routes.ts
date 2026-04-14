import type { FastifyInstance } from "fastify";
import type { StrategiesService } from "./strategies.service.js";
import { errorResponseSchema, strategySchema } from "../../shared/schemas.js";

type RegisterStrategiesRoutesOptions = {
  service: StrategiesService;
};

export const registerStrategiesRoutes = async (
  app: FastifyInstance,
  options: RegisterStrategiesRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/strategies",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: strategySchema,
          },
        },
      },
    },
    async () => options.service.list(),
  );

  app.post(
    "/api/v1/strategies",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "description", "params"],
          properties: {
            name: { type: "string", minLength: 3, maxLength: 120 },
            description: { type: "string", minLength: 1, maxLength: 800 },
            isEnabled: { type: "boolean", default: true },
            params: { type: "object", additionalProperties: true },
          },
          additionalProperties: false,
        },
        response: {
          201: strategySchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        description: string;
        isEnabled?: boolean;
        params: Record<string, unknown>;
      };

      const strategy = await options.service.create({
        name: body.name,
        description: body.description,
        isEnabled: body.isEnabled ?? true,
        params: body.params,
      });
      return reply.code(201).send(strategy);
    },
  );

  app.patch(
    "/api/v1/strategies/:id",
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
            name: { type: "string", minLength: 3, maxLength: 120 },
            description: { type: "string", minLength: 1, maxLength: 800 },
            isEnabled: { type: "boolean" },
            params: { type: "object", additionalProperties: true },
          },
          anyOf: [{ required: ["name"] }, { required: ["description"] }, { required: ["isEnabled"] }, { required: ["params"] }],
          additionalProperties: false,
        },
        response: {
          200: strategySchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as {
        name?: string;
        description?: string;
        isEnabled?: boolean;
        params?: Record<string, unknown>;
      };

      const updated = await options.service.update(params.id, body);
      if (!updated) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Strategy ${params.id} does not exist`,
        });
      }
      return updated;
    },
  );

  app.delete(
    "/api/v1/strategies/:id",
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
          204: { type: "null" },
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      await options.service.remove(params.id);
      return reply.code(204).send();
    },
  );
};
