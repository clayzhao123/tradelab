import type { FastifyInstance } from "fastify";
import {
  accountSnapshotSchema,
  errorResponseSchema,
  fillSchema,
  riskEventSchema,
  runSchema,
} from "../../shared/schemas.js";
import type { HistoryService } from "./history.service.js";
import { notFoundError } from "../../shared/app-error.js";

type RegisterHistoryRoutesOptions = {
  service: HistoryService;
};

export const registerHistoryRoutes = async (
  app: FastifyInstance,
  options: RegisterHistoryRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/history/runs",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 200, default: 50 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["runs"],
            properties: {
              runs: {
                type: "array",
                items: {
                  type: "object",
                  required: [
                    "runId",
                    "strategyId",
                    "status",
                    "startedAt",
                    "stoppedAt",
                    "stopReason",
                    "initialCash",
                    "fillsCount",
                    "riskEventsCount",
                    "turnover",
                    "fees",
                    "latestEquity",
                    "latestDrawdownPct",
                    "updatedAt",
                  ],
                  properties: {
                    runId: { type: "string" },
                    strategyId: { type: "string" },
                    status: { type: "string" },
                    startedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
                    stoppedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
                    stopReason: { anyOf: [{ type: "string" }, { type: "null" }] },
                    initialCash: { type: "number" },
                    fillsCount: { type: "number" },
                    riskEventsCount: { type: "number" },
                    turnover: { type: "number" },
                    fees: { type: "number" },
                    latestEquity: { anyOf: [{ type: "number" }, { type: "null" }] },
                    latestDrawdownPct: { anyOf: [{ type: "number" }, { type: "null" }] },
                    updatedAt: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { limit?: number };
      const runs = await options.service.listRunSummaries(query.limit ?? 50);
      return { runs };
    },
  );

  app.get(
    "/api/v1/history/runs/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
          additionalProperties: false,
        },
        querystring: {
          type: "object",
          properties: {
            fillsLimit: { type: "number", minimum: 1, maximum: 5000, default: 500 },
            eventsLimit: { type: "number", minimum: 1, maximum: 5000, default: 500 },
            snapshotsLimit: { type: "number", minimum: 1, maximum: 2000, default: 1000 },
            snapshotSampleEvery: { type: "number", minimum: 1, maximum: 50, default: 1 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["run", "summary", "fills", "riskEvents", "snapshots"],
            properties: {
              run: runSchema,
              summary: {
                type: "object",
                additionalProperties: true,
              },
              fills: { type: "array", items: fillSchema },
              riskEvents: { type: "array", items: riskEventSchema },
              snapshots: { type: "array", items: accountSnapshotSchema },
            },
            additionalProperties: false,
          },
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const query = request.query as {
        fillsLimit?: number;
        eventsLimit?: number;
        snapshotsLimit?: number;
        snapshotSampleEvery?: number;
      };
      const detail = await options.service.getRunDetail({
        runId: params.id,
        fillsLimit: query.fillsLimit ?? 500,
        eventsLimit: query.eventsLimit ?? 500,
        snapshotsLimit: query.snapshotsLimit ?? 1000,
        snapshotSampleEvery: query.snapshotSampleEvery ?? 1,
      });

      if (!detail) {
        throw notFoundError("not_found.run", `Run ${params.id} not found`, { runId: params.id });
      }
      return detail;
    },
  );
};
