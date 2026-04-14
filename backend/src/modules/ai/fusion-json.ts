import { AppError } from "../../shared/app-error.js";
import type { AiFusionIndicatorResult, AiFusionRadar } from "./ai.types.js";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const round2 = (value: number): number => Number(value.toFixed(2));

/** 去掉模型在 JSON 外夹带的思考块（用 \\u003c 等形式避免标签名干扰 TS/IDE） */
export const stripModelArtifactTags = (raw: string): string => {
  return raw
    .replace(/\u003cthinking\u003e[\s\S]*?\u003c\/thinking\u003e/gi, "")
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e/gi, "")
    .replace(/\u003credacted_reasoning\u003e[\s\S]*?\u003c\/redacted_reasoning\u003e/gi, "")
    .replace(/\u0060\u003cthink\u003e[\s\S]*?\u003c\/think\u003e\u0060/gi, "")
    .trim();
};

export const stripJsonFence = (raw: string): string => {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/u, "")
      .trim();
  }
  return t;
};

/**
 * 从「前面有废话 / 后面有废话」的文本里抠出第一个完整 JSON 对象（支持字符串内的引号转义）。
 */
export const extractFirstJsonObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (c === "{") {
      depth += 1;
    }
    if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
};

const normalizeForJsonParse = (raw: string): string =>
  raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

const tryParseFusionJson = (raw: string): unknown => {
  const cleaned = normalizeForJsonParse(stripJsonFence(stripModelArtifactTags(raw)));
  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (extracted) {
      return JSON.parse(extracted);
    }
    throw new Error("parse_failed");
  }
};

type RawIndicator = { id?: unknown; name?: unknown; weight?: unknown; reason?: unknown };

type RawRadar = {
  returnPotential?: unknown;
  robustness?: unknown;
  riskControl?: unknown;
  explainability?: unknown;
  marketFit?: unknown;
};

const parseRadar = (raw: unknown): AiFusionRadar => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AppError("AI response missing radar object", {
      statusCode: 502,
      category: "internal",
      code: "ai.fusion_radar_missing",
    });
  }
  const r = raw as RawRadar;
  const nums = [
    ["returnPotential", r.returnPotential],
    ["robustness", r.robustness],
    ["riskControl", r.riskControl],
    ["explainability", r.explainability],
    ["marketFit", r.marketFit],
  ] as const;
  const out: Partial<AiFusionRadar> = {};
  for (const [key, v] of nums) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      throw new AppError(`AI radar.${key} is not a number`, {
        statusCode: 502,
        category: "internal",
        code: "ai.fusion_radar_invalid",
        details: { key, value: v },
      });
    }
    out[key] = round2(clamp(n, 0, 100));
  }
  return out as AiFusionRadar;
};

const parseIndicators = (raw: unknown): AiFusionIndicatorResult[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AppError("AI response indicators must be a non-empty array", {
      statusCode: 502,
      category: "internal",
      code: "ai.fusion_indicators_invalid",
    });
  }
  const rows: AiFusionIndicatorResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as RawIndicator;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const w = typeof row.weight === "number" ? row.weight : Number(row.weight);
    const reason = typeof row.reason === "string" ? row.reason.trim() : "";
    if (!id || !name || !Number.isFinite(w) || !reason) {
      continue;
    }
    rows.push({ id, name, weight: w, reason });
  }
  if (rows.length === 0) {
    throw new AppError("AI response has no valid indicator rows", {
      statusCode: 502,
      category: "internal",
      code: "ai.fusion_indicators_empty",
    });
  }
  return rows;
};

export type ParsedAiFusionPayload = {
  strategyNameSuggestion: string;
  introduction: string;
  analysis: string;
  radar: AiFusionRadar;
  indicators: AiFusionIndicatorResult[];
};

export const parseFusionModelJson = (raw: string): ParsedAiFusionPayload => {
  let parsed: unknown;
  try {
    parsed = tryParseFusionJson(raw);
  } catch (cause) {
    const preview = stripModelArtifactTags(raw).slice(0, 400);
    throw new AppError("AI returned JSON that could not be parsed", {
      statusCode: 502,
      category: "internal",
      code: "ai.fusion_json_parse_failed",
      cause,
      details: { contentPreview: preview },
    });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AppError("AI JSON must be an object", {
      statusCode: 502,
      category: "internal",
      code: "ai.fusion_json_shape",
    });
  }
  const o = parsed as Record<string, unknown>;
  const strategyNameSuggestion =
    typeof o.strategyNameSuggestion === "string" ? o.strategyNameSuggestion.trim() : "";
  const introduction = typeof o.introduction === "string" ? o.introduction.trim() : "";
  const detailedEvaluation =
    typeof o.detailedEvaluation === "string" ? o.detailedEvaluation.trim() : "";
  const analysisLegacy = typeof o.analysis === "string" ? o.analysis.trim() : "";
  const analysis = detailedEvaluation || analysisLegacy;
  if (!strategyNameSuggestion || !introduction || !analysis) {
    throw new AppError(
      "AI JSON missing strategyNameSuggestion, introduction, or detailedEvaluation (or legacy analysis)",
      {
        statusCode: 502,
        category: "internal",
        code: "ai.fusion_text_fields_missing",
      },
    );
  }
  return {
    strategyNameSuggestion,
    introduction,
    analysis,
    radar: parseRadar(o.radar),
    indicators: parseIndicators(o.indicators),
  };
};

export const totalScoreFromRadar = (radar: AiFusionRadar): number =>
  round2((radar.returnPotential + radar.robustness + radar.riskControl + radar.explainability + radar.marketFit) / 5);
