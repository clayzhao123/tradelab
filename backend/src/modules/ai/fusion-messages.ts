const RADAR_RUBRIC = `
【雷达五项 0–100 分评分逻辑】（针对当前这套指标融合方案做主观结构化评估，不是回测数值）
1) returnPotential（收益潜力）：趋势/动量类信号在顺势行情中的理论进攻性；冲突指标多、滞后严重则降分。
2) robustness（稳健性）：跨周期、跨品种、参数不过分敏感；单一风格或易过拟合则降分。
3) riskControl（风控）：是否含波动/止损/结构类约束，权重是否合理；纯追涨无风控则降分。
4) explainability（可解释性）：权重与逻辑是否能让交易员一句话说清；黑箱堆叠则降分。
5) marketFit（行情适配）：对趋势/震荡/高波动等场景的匹配度；明显错配则降分。

每项输出 0–100 的整数；五维可相关但不要机械相同，需简短自洽（可在 detailedEvaluation 里用一两句点明依据）。
`.trim();

const DETAILED_EVALUATION_FORMAT = `
【详细评价 detailedEvaluation】必须为中文，Markdown，且严格按下面五级标题依次输出（标题文字一字不改，标题下至少一行正文）：

### 组合概览
（一句话说明融合在做什么）

### 指标协同
（各指标如何互补/是否打架）

### 风险与局限
（失效场景、过拟合、延迟等）

### 适用行情
（趋势/震荡/高波动等适配）

### 权重逻辑
（为何如此分配权重）

禁止在 detailedEvaluation 外再输出任何说明性文字；所有非 JSON 内容只能写在该字段字符串内部。
`.trim();

const JSON_SHAPE = `{
  "strategyNameSuggestion": "英文短标题",
  "introduction": "一句英文副标题",
  "radar": {
    "returnPotential": 0,
    "robustness": 0,
    "riskControl": 0,
    "explainability": 0,
    "marketFit": 0
  },
  "detailedEvaluation": "中文 Markdown，格式见上文",
  "indicators": [
    { "id": "指标id", "name": "名称", "weight": 0, "reason": "英文或中英简短理由" }
  ]
}`;

export const buildFusionSystemPrompt = (): string =>
  [
    "You are a quantitative trading assistant. Output ONE JSON object only.",
    "Hard rules:",
    "- No markdown code fences. No text before or after the JSON.",
    "- Use double quotes for all JSON keys and string values. No trailing commas.",
    "- Keys must be exactly as specified (snake-free camelCase as shown).",
    "- radar: five integers 0-100 inclusive, matching keys returnPotential, robustness, riskControl, explainability, marketFit.",
    "- detailedEvaluation: Chinese Markdown string, following the fixed heading structure given in the user message.",
    "- indicators: only use ids from the allowed list in the user message; weights > 0, sum should be 100 (server may renormalize slightly).",
    "",
    RADAR_RUBRIC,
    "",
    DETAILED_EVALUATION_FORMAT,
    "",
    "Exact JSON shape (example structure, replace values):",
    JSON_SHAPE,
  ].join("\n");

export const buildFusionUserMessage = (params: {
  mode: "prompt" | "selected";
  prompt: string;
  allowedIds: string[];
  poolJson: string;
  selectedJson: string | null;
}): string => {
  const allowedLine = `Allowed indicator ids (only these): ${JSON.stringify(params.allowedIds)}`;
  if (params.mode === "prompt") {
    return [
      "任务：根据用户目标，从指标池中选择 2–8 个指标并分配权重，填写 radar 分数与 detailedEvaluation。",
      `用户目标：${params.prompt}`,
      allowedLine,
      "指标目录 JSON：",
      params.poolJson,
    ].join("\n\n");
  }
  return [
    "任务：在用户已选指标集合上重新分配权重并写清理由；radar 与 detailedEvaluation 须反映该组合。",
    params.prompt ? `用户补充说明：${params.prompt}` : "用户未提供补充说明。",
    allowedLine,
    "用户当前选择（含权重）JSON：",
    params.selectedJson ?? "[]",
    "完整目录（供对照）JSON：",
    params.poolJson,
  ].join("\n\n");
};
