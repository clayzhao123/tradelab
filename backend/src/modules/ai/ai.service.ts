import { AppError } from "../../shared/app-error.js";
import type { AiSettingsRepository } from "../../repositories/ai-settings.repository.js";
import type {
  AiConfigUpdateInput,
  AiFusionIndicatorInput,
  AiFusionIndicatorPoolEntry,
  AiFusionIndicatorResult,
  AiFusionInput,
  AiFusionResult,
  AiProviderConfigPublic,
} from "./ai.types.js";
import { buildFusionSystemPrompt, buildFusionUserMessage } from "./fusion-messages.js";
import { parseFusionModelJson, totalScoreFromRadar } from "./fusion-json.js";
import { callMiniMaxChatCompletion } from "./minimax-chat.client.js";

type PromptTemplateIndicator = {
  id: string;
  name: string;
  keywords: string[];
  reason: string;
};

const SUPPORTED_PROVIDER = "minimax" as const;

const PROMPT_INDICATORS: PromptTemplateIndicator[] = [
  {
    id: "ema",
    name: "EMA",
    keywords: ["trend", "breakout", "follow", "趋势", "突破", "跟随"],
    reason: "EMA helps track medium-term trend direction with responsive smoothing.",
  },
  {
    id: "macd",
    name: "MACD",
    keywords: ["momentum", "acceleration", "动量", "拐点"],
    reason: "MACD confirms momentum acceleration and trend continuation quality.",
  },
  {
    id: "rsi",
    name: "RSI",
    keywords: ["mean reversion", "overbought", "oversold", "回归", "超买", "超卖"],
    reason: "RSI adds cycle extremes and reversal timing for entries.",
  },
  {
    id: "bb",
    name: "Bollinger Bands",
    keywords: ["volatility", "band", "squeeze", "波动", "带宽", "挤压"],
    reason: "Bollinger Bands capture volatility regime shifts and breakout context.",
  },
  {
    id: "obv",
    name: "OBV",
    keywords: ["volume", "flow", "成交量", "资金流"],
    reason: "OBV verifies whether price movement is supported by directional volume.",
  },
  {
    id: "vwap",
    name: "VWAP",
    keywords: ["intraday", "execution", "benchmark", "日内", "均价"],
    reason: "VWAP anchors entries around fair-value execution zones.",
  },
  {
    id: "atr",
    name: "ATR",
    keywords: ["risk", "stop", "drawdown", "风控", "止损", "回撤"],
    reason: "ATR provides adaptive volatility-aware stop and sizing controls.",
  },
  {
    id: "vp",
    name: "Volume Profile",
    keywords: ["structure", "support", "resistance", "结构", "支撑", "阻力"],
    reason: "Volume Profile highlights high-participation price zones for structure alignment.",
  },
];

const round2 = (value: number): number => Number(value.toFixed(2));

const normalizeWeights = (rows: AiFusionIndicatorResult[]): AiFusionIndicatorResult[] => {
  if (rows.length === 0) {
    return [];
  }
  const safe = rows.map((row) => ({ ...row, weight: Math.max(0, row.weight) }));
  const total = safe.reduce((sum, row) => sum + row.weight, 0);
  if (total <= 0) {
    const base = 100 / safe.length;
    return safe.map((row, index) => ({
      ...row,
      weight: index === safe.length - 1 ? round2(100 - base * (safe.length - 1)) : round2(base),
    }));
  }

  const normalized = safe.map((row) => ({
    ...row,
    weight: round2((row.weight / total) * 100),
  }));
  const normalizedTotal = normalized.reduce((sum, row) => sum + row.weight, 0);
  normalized[normalized.length - 1].weight = round2(normalized[normalized.length - 1].weight + (100 - normalizedTotal));
  return normalized;
};

const sanitizeIndicatorPool = (raw: AiFusionIndicatorPoolEntry[] | undefined): AiFusionIndicatorPoolEntry[] => {
  if (!raw?.length) {
    return [];
  }
  const seen = new Set<string>();
  const out: AiFusionIndicatorPoolEntry[] = [];
  for (const row of raw.slice(0, 120)) {
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!id || !name || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const family = typeof row.family === "string" ? row.family.trim() : undefined;
    const description = typeof row.description === "string" ? row.description.trim() : undefined;
    const labels = Array.isArray(row.labels)
      ? row.labels.map((label) => String(label).trim()).filter((label) => label.length > 0).slice(0, 12)
      : undefined;
    out.push({
      id,
      name,
      ...(family ? { family } : {}),
      ...(description ? { description } : {}),
      ...(labels && labels.length > 0 ? { labels } : {}),
    });
  }
  return out;
};

const fallbackIndicatorPool = (): AiFusionIndicatorPoolEntry[] =>
  PROMPT_INDICATORS.map((indicator) => ({
    id: indicator.id,
    name: indicator.name,
    family: "mixed",
    description: indicator.reason,
    labels: [],
  }));

const compactPoolForModel = (pool: AiFusionIndicatorPoolEntry[]): Array<Record<string, unknown>> =>
  pool.map((row) => ({
    id: row.id,
    name: row.name,
    family: row.family ?? "",
    description: (row.description ?? "").slice(0, 200),
    labels: (row.labels ?? []).slice(0, 8),
  }));

const normalizeSelectedForContext = (input: AiFusionIndicatorInput[]): AiFusionIndicatorInput[] =>
  input
    .filter((row) => row.id.trim().length > 0 && row.name.trim().length > 0)
    .slice(0, 8)
    .map((row) => ({
      id: row.id.trim(),
      name: row.name.trim(),
      family: row.family?.trim(),
      labels: row.labels,
      weight: Number.isFinite(row.weight) ? row.weight : 0,
    }));

export class AiService {
  constructor(private readonly settingsRepository: AiSettingsRepository) {}

  async getConfig(): Promise<AiProviderConfigPublic> {
    return this.settingsRepository.getPublic();
  }

  async updateConfig(input: AiConfigUpdateInput): Promise<AiProviderConfigPublic> {
    if (input.provider !== SUPPORTED_PROVIDER) {
      throw new AppError("Only minimax provider is supported in V1", {
        statusCode: 400,
        category: "validation",
        code: "validation.ai_provider_unsupported",
      });
    }
    if (!input.model.trim()) {
      throw new AppError("Model is required", {
        statusCode: 400,
        category: "validation",
        code: "validation.ai_model_required",
      });
    }
    return this.settingsRepository.upsert({
      provider: SUPPORTED_PROVIDER,
      model: input.model.trim(),
      apiKey: input.apiKey,
    });
  }

  async generateFusion(input: AiFusionInput): Promise<AiFusionResult> {
    if (input.mode !== "prompt" && input.mode !== "selected") {
      throw new AppError("Invalid AI fusion mode", {
        statusCode: 400,
        category: "validation",
        code: "validation.ai_fusion_mode_invalid",
      });
    }

    const prompt = input.prompt?.trim() ?? "";
    if (input.mode === "prompt" && !prompt) {
      throw new AppError("Prompt mode requires a natural-language prompt", {
        statusCode: 400,
        category: "validation",
        code: "validation.ai_prompt_required",
      });
    }

    const stored = await this.settingsRepository.getStored();
    const apiKey = stored?.apiKey?.trim() ?? "";
    if (!apiKey) {
      throw new AppError("请先保存 MiniMax API Key，再生成 AI 融合。", {
        statusCode: 400,
        category: "validation",
        code: "validation.ai_api_key_missing",
      });
    }

    const model = stored?.model?.trim() || "MiniMax-M2.7";

    let pool = sanitizeIndicatorPool(input.indicatorPool);

    let allowedIds: string[] = [];
    let selectedJson: string | null = null;

    if (input.mode === "selected") {
      const selected = input.selectedIndicators ?? [];
      if (selected.length === 0) {
        throw new AppError("Selected mode requires selected indicators", {
          statusCode: 400,
          category: "validation",
          code: "validation.ai_selected_indicators_required",
        });
      }
      const normalizedSelected = normalizeSelectedForContext(selected);
      if (normalizedSelected.length === 0) {
        throw new AppError("No valid indicators received for selected mode", {
          statusCode: 400,
          category: "validation",
          code: "validation.ai_selected_indicators_invalid",
        });
      }
      allowedIds = normalizedSelected.map((row) => row.id);
      selectedJson = JSON.stringify(normalizedSelected);
      const byId = new Map(pool.map((row) => [row.id, row]));
      for (const row of normalizedSelected) {
        if (!byId.has(row.id)) {
          byId.set(row.id, {
            id: row.id,
            name: row.name,
            ...(row.family ? { family: row.family } : {}),
            description: "",
            ...(row.labels && row.labels.length > 0 ? { labels: row.labels } : {}),
          });
        }
      }
      pool = [...byId.values()];
    }

    if (pool.length === 0) {
      pool = fallbackIndicatorPool();
    }

    if (input.mode === "prompt") {
      allowedIds = pool.map((row) => row.id);
    }

    const poolJson = JSON.stringify(compactPoolForModel(pool));
    const userMessage = buildFusionUserMessage({
      mode: input.mode,
      prompt: input.mode === "prompt" ? prompt : prompt,
      allowedIds,
      poolJson,
      selectedJson,
    });

    const system = buildFusionSystemPrompt();
    const raw = await callMiniMaxChatCompletion({
      apiKey,
      model,
      system,
      user: userMessage,
      temperature: 0.35,
      maxTokens: 4096,
    });

    const parsed = parseFusionModelJson(raw);
    const allowed = new Set(allowedIds);
    const poolById = new Map(pool.map((row) => [row.id, row]));

    const filtered = parsed.indicators.filter((row) => allowed.has(row.id));
    const enriched = filtered.map((row) => ({
      ...row,
      name: poolById.get(row.id)?.name ?? row.name,
    }));

    if (enriched.length < 2) {
      throw new AppError("模型返回的指标数量不足或 id 不在允许列表中，请重试。", {
        statusCode: 502,
        category: "internal",
        code: "ai.fusion_indicators_filtered_too_few",
        details: { allowedIds, modelReturned: parsed.indicators.map((row) => row.id) },
      });
    }

    const indicators = normalizeWeights(enriched);
    const totalScore = totalScoreFromRadar(parsed.radar);

    return {
      mode: input.mode,
      provider: SUPPORTED_PROVIDER,
      model,
      totalScore,
      radar: parsed.radar,
      strategyNameSuggestion: parsed.strategyNameSuggestion,
      introduction: parsed.introduction,
      analysis: parsed.analysis,
      indicators,
    };
  }
}
