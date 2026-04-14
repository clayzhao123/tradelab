export type AiProvider = "minimax";

export type AiProviderConfigPublic = {
  provider: AiProvider;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AiProviderConfigStored = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
};

export type AiConfigUpdateInput = {
  provider: AiProvider;
  model: string;
  apiKey?: string;
};

export type AiFusionMode = "prompt" | "selected";

export type AiFusionIndicatorInput = {
  id: string;
  name: string;
  family?: string;
  labels?: string[];
  weight?: number;
};

export type AiFusionIndicatorPoolEntry = {
  id: string;
  name: string;
  family?: string;
  description?: string;
  labels?: string[];
};

export type AiFusionInput = {
  mode: AiFusionMode;
  prompt?: string;
  selectedIndicators?: AiFusionIndicatorInput[];
  /** Full indicator catalog from client; used so the model only emits valid ids. */
  indicatorPool?: AiFusionIndicatorPoolEntry[];
};

export type AiFusionIndicatorResult = {
  id: string;
  name: string;
  weight: number;
  reason: string;
};

export type AiFusionRadar = {
  returnPotential: number;
  robustness: number;
  riskControl: number;
  explainability: number;
  marketFit: number;
};

export type AiFusionResult = {
  mode: AiFusionMode;
  provider: AiProvider;
  model: string;
  totalScore: number;
  radar: AiFusionRadar;
  strategyNameSuggestion: string;
  introduction: string;
  /** Long-form analysis (typically Chinese markdown). */
  analysis: string;
  indicators: AiFusionIndicatorResult[];
};
