import type { FastifyInstance } from "fastify";
import { scanResultSchema, scanRunSchema } from "../../shared/schemas.js";
import type { ScannerService } from "./scanner.service.js";

type RegisterScannerRoutesOptions = {
  service: ScannerService;
};

export const registerScannerRoutes = async (
  app: FastifyInstance,
  options: RegisterScannerRoutesOptions,
): Promise<void> => {
  app.get(
    "/api/v1/scan/results",
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
            required: ["results"],
            properties: {
              results: { type: "array", items: scanResultSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { limit?: number };
      const results = await options.service.getLatestResults(query.limit ?? 50);
      return { results };
    },
  );

  app.post(
    "/api/v1/scan/run",
    {
      schema: {
        body: {
          type: "object",
          required: ["symbols", "timeframe"],
          properties: {
            symbols: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: { type: "string", minLength: 2, maxLength: 32 },
            },
            timeframe: { type: "string", minLength: 1, maxLength: 16 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            required: ["scanRun", "results"],
            properties: {
              scanRun: scanRunSchema,
              results: { type: "array", items: scanResultSchema },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      const body = request.body as { symbols: string[]; timeframe: string };
      return options.service.runScan({
        symbols: body.symbols,
        timeframe: body.timeframe,
      });
    },
  );
};

