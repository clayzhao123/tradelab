import type { FastifyInstance } from "fastify";
import { errorResponseSchema, riskEventSchema, riskRulesSchema } from "../../shared/schemas.js";
import type { RiskService } from "./risk.service.js";

type RegisterRiskRoutesOptions = {
  service: RiskService;
};

export const registerRiskRoutes = async (
  app: FastifyInstance,
  options: RegisterRiskRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/risk/rules",
    {
      schema: {
        response: {
          200: riskRulesSchema,
        },
      },
    },
    async () => options.service.getRules(),
  );

  app.patch(
    "/api/v1/risk/rules",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            isEnabled: { type: "boolean" },
            maxSymbolExposurePct: { type: "number", exclusiveMinimum: 0, maximum: 1 },
            maxGrossExposurePct: { type: "number", exclusiveMinimum: 0, maximum: 3 },
            maxDrawdownPct: { type: "number", exclusiveMinimum: 0, maximum: 1 },
            minCashBalance: { type: "number", minimum: 0 },
            maxOrderNotional: { type: "number", exclusiveMinimum: 0 },
          },
          anyOf: [
            { required: ["name"] },
            { required: ["isEnabled"] },
            { required: ["maxSymbolExposurePct"] },
            { required: ["maxGrossExposurePct"] },
            { required: ["maxDrawdownPct"] },
            { required: ["minCashBalance"] },
            { required: ["maxOrderNotional"] },
          ],
          additionalProperties: false,
        },
        response: {
          200: riskRulesSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const patch = request.body as {
        name?: string;
        isEnabled?: boolean;
        maxSymbolExposurePct?: number;
        maxGrossExposurePct?: number;
        maxDrawdownPct?: number;
        minCashBalance?: number;
        maxOrderNotional?: number;
      };
      return options.service.updateRules(patch);
    },
  );

  app.get(
    "/api/v1/risk/events",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 500, default: 200 },
            severity: { type: "string", enum: ["info", "warning", "critical"] },
            runId: { type: "string" },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["events"],
            properties: {
              events: { type: "array", items: riskEventSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { limit?: number; severity?: "info" | "warning" | "critical"; runId?: string };
      const events = await options.service.getEvents({
        limit: query.limit ?? 200,
        severity: query.severity,
        runId: query.runId,
      });
      return { events };
    },
  );
};
