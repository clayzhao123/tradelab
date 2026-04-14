import type { FastifyInstance } from "fastify";
import type { AiService } from "./ai.service.js";
import { errorResponseSchema } from "../../shared/schemas.js";

type RegisterAiRoutesOptions = {
  service: AiService;
};

export const registerAiRoutes = async (
  app: FastifyInstance,
  options: RegisterAiRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/ai/config",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["provider", "model", "hasApiKey", "apiKeyMasked", "createdAt", "updatedAt"],
            properties: {
              provider: { type: "string", enum: ["minimax"] },
              model: { type: "string" },
              hasApiKey: { type: "boolean" },
              apiKeyMasked: { anyOf: [{ type: "string" }, { type: "null" }] },
              createdAt: { anyOf: [{ type: "string" }, { type: "null" }] },
              updatedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async () => options.service.getConfig(),
  );

  app.put(
    "/api/v1/ai/config",
    {
      schema: {
        body: {
          type: "object",
          required: ["provider", "model"],
          properties: {
            provider: { type: "string", enum: ["minimax"] },
            model: { type: "string", minLength: 1, maxLength: 120 },
            apiKey: { type: "string", minLength: 1, maxLength: 400 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["provider", "model", "hasApiKey", "apiKeyMasked", "createdAt", "updatedAt"],
            properties: {
              provider: { type: "string", enum: ["minimax"] },
              model: { type: "string" },
              hasApiKey: { type: "boolean" },
              apiKeyMasked: { anyOf: [{ type: "string" }, { type: "null" }] },
              createdAt: { anyOf: [{ type: "string" }, { type: "null" }] },
              updatedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            additionalProperties: false,
          },
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = request.body as {
        provider: "minimax";
        model: string;
        apiKey?: string;
      };
      return options.service.updateConfig(body);
    },
  );

  app.post(
    "/api/v1/ai/fusion/generate",
    {
      schema: {
        body: {
          type: "object",
          required: ["mode"],
          properties: {
            mode: { type: "string", enum: ["prompt", "selected"] },
            prompt: { type: "string", minLength: 1, maxLength: 1000 },
            selectedIndicators: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                required: ["id", "name"],
                properties: {
                  id: { type: "string", minLength: 1, maxLength: 80 },
                  name: { type: "string", minLength: 1, maxLength: 120 },
                  family: { type: "string", minLength: 1, maxLength: 80 },
                  labels: {
                    type: "array",
                    maxItems: 12,
                    items: { type: "string", minLength: 1, maxLength: 80 },
                  },
                  weight: { type: "number", minimum: 0, maximum: 100 },
                },
                additionalProperties: false,
              },
            },
            indicatorPool: {
              type: "array",
              maxItems: 120,
              items: {
                type: "object",
                required: ["id", "name"],
                properties: {
                  id: { type: "string", minLength: 1, maxLength: 80 },
                  name: { type: "string", minLength: 1, maxLength: 120 },
                  family: { type: "string", minLength: 1, maxLength: 80 },
                  description: { type: "string", maxLength: 600 },
                  labels: {
                    type: "array",
                    maxItems: 16,
                    items: { type: "string", minLength: 1, maxLength: 80 },
                  },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: [
              "mode",
              "provider",
              "model",
              "totalScore",
              "radar",
              "strategyNameSuggestion",
              "introduction",
              "analysis",
              "indicators",
            ],
            properties: {
              mode: { type: "string", enum: ["prompt", "selected"] },
              provider: { type: "string", enum: ["minimax"] },
              model: { type: "string" },
              totalScore: { type: "number" },
              radar: {
                type: "object",
                required: ["returnPotential", "robustness", "riskControl", "explainability", "marketFit"],
                properties: {
                  returnPotential: { type: "number" },
                  robustness: { type: "number" },
                  riskControl: { type: "number" },
                  explainability: { type: "number" },
                  marketFit: { type: "number" },
                },
                additionalProperties: false,
              },
              strategyNameSuggestion: { type: "string" },
              introduction: { type: "string" },
              analysis: { type: "string" },
              indicators: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "name", "weight", "reason"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    weight: { type: "number" },
                    reason: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = request.body as {
        mode: "prompt" | "selected";
        prompt?: string;
        selectedIndicators?: Array<{
          id: string;
          name: string;
          family?: string;
          labels?: string[];
          weight?: number;
        }>;
        indicatorPool?: Array<{
          id: string;
          name: string;
          family?: string;
          description?: string;
          labels?: string[];
        }>;
      };
      return options.service.generateFusion(body);
    },
  );
};
