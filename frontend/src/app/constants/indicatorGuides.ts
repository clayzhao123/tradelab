import { type IndicatorDefinition, type IndicatorFamily } from "./indicatorCatalog";

export type GuideVisualMode =
  | "trend"
  | "oscillator"
  | "band"
  | "volume"
  | "structure"
  | "risk"
  | "derivatives";

export type IndicatorGuide = {
  quickIntro: string;
  coreConcept: string;
  readMethod: string[];
  practicalWorkflow: string[];
  caution: string[];
  formula: string;
  chartMode: GuideVisualMode;
  chartHint: string;
};

type FamilyGuideTemplate = {
  chartMode: GuideVisualMode;
  quickPrefix: string;
  coreConcept: string;
  readMethod: string[];
  practicalWorkflow: string[];
  caution: string[];
  chartHint: string;
};

const FAMILY_GUIDE: Record<IndicatorFamily, FamilyGuideTemplate> = {
  trend: {
    chartMode: "trend",
    quickPrefix: "趋势跟随",
    coreConcept: "这类指标的目标是把价格噪音平滑掉，帮助你判断行情到底在上涨、下跌还是震荡。",
    readMethod: [
      "先看斜率：线往上且持续抬高，趋势偏多；线往下且持续降低，趋势偏空。",
      "再看价格位置：价格长期站在线上方，说明多头主导；长期在线下方，说明空头主导。",
      "交叉或拐点通常是“节奏切换”信号，但需要用成交量或波动率确认。",
    ],
    practicalWorkflow: [
      "用较长周期线先定方向，再用较短周期线找入场时机。",
      "强趋势里优先顺势回踩，不要在明显加速段盲目追高追低。",
      "和波动率指标配合，避免在震荡期频繁来回止损。",
    ],
    caution: [
      "趋势指标天然滞后，越平滑越稳但反应越慢。",
      "震荡行情会出现“假突破 + 假拐头”，要降低仓位或加过滤条件。",
    ],
    chartHint: "紫色线是指标主线；当价格蜡烛持续在主线上方，通常代表趋势偏强。",
  },
  momentum: {
    chartMode: "oscillator",
    quickPrefix: "动量强弱",
    coreConcept: "这类指标衡量上涨/下跌的速度和力度，核心是判断“当前推力是否衰减或增强”。",
    readMethod: [
      "先看区间位置：高位不一定立刻跌，低位不一定立刻涨，要结合拐头确认。",
      "再看背离：价格创新高但动量不创新高，常见于上涨动能衰减。",
      "中轴线附近反复震荡时，说明趋势不明确，信号可信度较低。",
    ],
    practicalWorkflow: [
      "先用趋势指标定大方向，再用动量指标做进出场节奏。",
      "动量从极值区回到中性区，常用于“止盈而非反手”。",
      "多时间框架共振时，信号质量通常更高。",
    ],
    caution: [
      "超买超卖是“状态”不是“指令”，强趋势里会长期钝化。",
      "单独使用动量指标容易逆势抄顶抄底。",
    ],
    chartHint: "上方是蜡烛走势，下方是动量曲线；曲线拐头并回穿阈值时，信号更可靠。",
  },
  volatility: {
    chartMode: "band",
    quickPrefix: "波动扩张",
    coreConcept: "这类指标关注价格波动幅度，帮助你识别“市场在压缩、爆发还是过热”。",
    readMethod: [
      "带宽收窄通常代表波动压缩，后续更容易出现方向性突破。",
      "价格贴着上轨/下轨运行，更多代表强势而非立刻反转。",
      "波动率抬升时，止损和仓位都要同步调整。",
    ],
    practicalWorkflow: [
      "先判断是“收缩待爆发”还是“爆发后衰减”的阶段。",
      "突破策略可在带宽扩张时跟随，均值回归策略可在极端偏离后等待回归。",
      "使用 ATR 类指标动态设置止损距离，避免固定点数失真。",
    ],
    caution: [
      "波动率指标不直接给方向，必须和趋势/结构配合。",
      "波动骤增时滑点和冲击成本会明显变大。",
    ],
    chartHint: "中线周围的上下包络表示波动区间；区间从窄变宽常对应行情启动。",
  },
  volume: {
    chartMode: "volume",
    quickPrefix: "量价确认",
    coreConcept: "这类指标把成交量引入判断，核心是验证价格变动是否有真实资金推动。",
    readMethod: [
      "价涨量增通常代表趋势健康；价涨量缩要警惕“虚涨”。",
      "量能指标先于价格转向时，常是拐点预警信号。",
      "关键位突破若无量配合，回落概率通常更高。",
    ],
    practicalWorkflow: [
      "先用价格结构找关键位，再用量能决定是否跟随突破。",
      "趋势中优先做“顺势 + 放量确认”的段落。",
      "在低流动性时段，量价信号失真概率更高。",
    ],
    caution: [
      "不同交易所/品种的成交量口径不一致，跨市场对比要谨慎。",
      "量能放大也可能来自恐慌盘，需要结合K线形态判断。",
    ],
    chartHint: "蜡烛下方柱体代表成交量；价格突破同时量柱放大，通常更具持续性。",
  },
  mean_reversion: {
    chartMode: "band",
    quickPrefix: "均值回归",
    coreConcept: "这类指标假设价格偏离均值后会回归，关键是识别“偏离是否过度”。",
    readMethod: [
      "先看偏离程度，再看回归触发（反包、背离、回到阈值内）。",
      "极端偏离越大，潜在回归空间越大，但也可能进入趋势失效。",
      "回归交易更看重出场纪律，入场正确也可能因拖延而回吐。",
    ],
    practicalWorkflow: [
      "只在震荡或弱趋势阶段重点使用，强趋势阶段降低频率。",
      "分批建仓和分批止盈可降低“抄底抄早”的风险。",
      "搭配波动率过滤，避免在趋势爆发行情硬做回归。",
    ],
    caution: [
      "均值回归在单边趋势里容易连续止损。",
      "参数过短会被噪音触发，参数过长会错过主要回归段。",
    ],
    chartHint: "价格远离中线后回到通道内，通常是回归信号确认点。",
  },
  market_structure: {
    chartMode: "structure",
    quickPrefix: "结构位置",
    coreConcept: "这类指标研究关键支撑阻力与结构突破，重点是“价格在什么位置做了什么动作”。",
    readMethod: [
      "先找结构位（前高前低、区间边界、枢轴区）。",
      "再看行为：假突破、真突破、回踩确认会带来完全不同结果。",
      "结构被有效击穿后，原支撑/阻力往往会角色互换。",
    ],
    practicalWorkflow: [
      "围绕关键位制定 A/B 计划：突破跟随 vs. 失败反向。",
      "把止损放在“结构被否定的位置”，而不是任意点数。",
      "结合成交量或波动率判断突破质量。",
    ],
    caution: [
      "结构位不是精确点，而是区域，过度精确会被噪音扫损。",
      "低时间框架的结构更易失真，需上级别确认。",
    ],
    chartHint: "图中横向区域代表结构位；突破后回踩不破，通常是延续信号。",
  },
  statistical: {
    chartMode: "structure",
    quickPrefix: "统计滤波",
    coreConcept: "这类指标用统计方法衡量关系稳定性和状态切换，适合做过滤和风险校准。",
    readMethod: [
      "先看统计量是否稳定，再决定能否信任该信号。",
      "统计显著性下降时，应降低杠杆或暂停该策略分支。",
      "这类指标更适合作“条件开关”，而非单独下单指令。",
    ],
    practicalWorkflow: [
      "将统计指标作为上层过滤器，控制策略是否启用。",
      "定期回看窗口长度，避免参数固化导致失效。",
      "多用滚动验证，确认不是单一阶段巧合。",
    ],
    caution: [
      "样本外漂移是常态，历史关系不保证未来持续。",
      "统计指标解释门槛高，需配合可视化验证。",
    ],
    chartHint: "蜡烛图上叠加统计区间后，可直观看到“偏离-回归-失效”的节奏。",
  },
  risk: {
    chartMode: "risk",
    quickPrefix: "风险约束",
    coreConcept: "这类指标不负责“找机会”，而是控制回撤、尾部风险和策略稳定性。",
    readMethod: [
      "先看风险是否抬升，再决定是减仓、降频还是暂停。",
      "收益上升但风险指标恶化，往往是脆弱阶段。",
      "风险指标通常滞后，但对避免大亏很关键。",
    ],
    practicalWorkflow: [
      "把风险阈值写成硬规则，不依赖主观判断。",
      "风险触发后先保命：减仓 > 暂停 > 复盘恢复。",
      "把止损、仓位、杠杆与风险状态联动。",
    ],
    caution: [
      "只盯收益不盯风险，净值会在极端行情里一次性回吐。",
      "风险指标参数过慢会导致响应不及时。",
    ],
    chartHint: "上方是价格蜡烛，下方是风险/回撤曲线；曲线抬升阶段应主动降风险。",
  },
  derivatives: {
    chartMode: "derivatives",
    quickPrefix: "衍生品情绪",
    coreConcept: "这类指标从资金费率、持仓和清算等衍生品数据衡量拥挤度与杠杆风险。",
    readMethod: [
      "过度一致的多空拥挤，常对应反向波动风险上升。",
      "资金费率、持仓和价格出现背离时，通常是拐点前兆。",
      "清算不平衡会放大短时波动，需要快速风险控制。",
    ],
    practicalWorkflow: [
      "把衍生品指标作为“情绪温度计”，避免追在最拥挤一侧。",
      "与现货结构结合，判断是趋势延续还是挤仓反转。",
      "极端值阶段采用更保守的仓位和更快的止盈止损。",
    ],
    caution: [
      "不同平台的衍生品数据有偏差，需统一口径。",
      "极端拥挤可持续很久，不能只凭一次极值逆势重仓。",
    ],
    chartHint: "价格蜡烛下方的衍生品柱/线表示情绪与杠杆变化，极端抬升时常伴随剧烈波动。",
  },
};

const LABEL_HINTS: Record<string, string> = {
  "moving-average": "它属于均线系，适合看“方向过滤 + 回踩节奏”。",
  lagging: "它更稳但更慢，适合过滤噪音，不适合抢最早转折。",
  responsive: "它对新价格更敏感，入场更早但假信号会增加。",
  "low-lag": "它在降低滞后和稳定性之间做平衡，适合快节奏趋势。",
  oscillator: "振荡器更适合判断动能状态，而非直接判断趋势方向。",
  breakout: "可重点关注关键位突破后的持续性与回踩确认。",
  "mean-reversion": "适合偏震荡阶段，强趋势里需严格控制逆势仓位。",
  "support-resistance": "建议把信号放到结构区间里解读，不要只看单点穿越。",
  risk: "可把该信号用于仓位和止损动态调整，而不是单独入场。",
  sentiment: "情绪极端常与反向波动共振，但要等待价格确认。",
};

const FORMULA_BY_ID: Record<string, string> = {
  sma: "SMA(N) = (C1 + C2 + ... + CN) / N",
  ema: "EMA(N) = α * C + (1-α) * EMA_prev，α = 2/(N+1)",
  wma: "WMA(N) = Σ(w_i * C_i) / Σ(w_i)，近期权重更高",
  hma: "HMA(N) = WMA(2*WMA(N/2) - WMA(N), sqrt(N))",
  kama: "KAMA = KAMA_prev + SC * (Price - KAMA_prev)",
  macd: "MACD = EMA(12)-EMA(26)，Signal = EMA(MACD,9)",
  adx: "ADX = EMA(DX, N)，DX 由 +DI 与 -DI 计算",
  dmi: "+DI/-DI 基于定向波动，交叉用于方向判断",
  supertrend: "Supertrend = MedianPrice ± ATR * Multiplier",
  ichimoku: "转换线/基准线/领先跨度组合判定趋势与云层位置",
  rsi: "RSI = 100 - 100/(1 + RS)",
  stoch: "%K = (C-Ln)/(Hn-Ln)*100，%D = SMA(%K)",
  cci: "CCI = (TP - SMA(TP)) / (0.015 * MeanDeviation)",
  roc: "ROC = (C - Cn) / Cn * 100",
  atr: "ATR = EMA(TrueRange, N)",
  bb: "中轨 = SMA(N)，上/下轨 = 中轨 ± K*StdDev",
  vwap: "VWAP = Σ(Price*Volume) / Σ(Volume)",
  obv: "OBV = 累积成交量(涨日加、跌日减)",
  cmf: "CMF = Σ(MFM*Volume)/Σ(Volume)",
  zscore: "Z = (Price - Mean(N)) / StdDev(N)",
  var: "VaR(p) = 在置信水平 p 下的潜在最大损失估计",
  expected_shortfall: "ES = 超过 VaR 阈值后的平均尾部损失",
};

function resolveFormula(indicator: IndicatorDefinition): string {
  const direct = FORMULA_BY_ID[indicator.id];
  if (direct) {
    return direct;
  }

  if (indicator.labels.includes("moving-average")) {
    return `${indicator.name}(N) = 对价格进行滚动平滑，N 越大越平滑、越滞后`;
  }
  if (indicator.labels.includes("oscillator")) {
    return `${indicator.name}(t) = 基于滚动窗口的相对强弱/速度函数，常用阈值区间判断状态`;
  }
  if (indicator.labels.includes("channel")) {
    return `${indicator.name}(t) = 中线 ± 波动尺度(ATR/StdDev 等)`;
  }
  if (indicator.family === "volume") {
    return `${indicator.name}(t) = 价格与成交量的耦合函数，用于量价确认`;
  }
  if (indicator.family === "derivatives") {
    return `${indicator.name}(t) = 基于资金费率/持仓/清算等衍生品数据的拥挤度函数`;
  }
  return `${indicator.name}(t) = 在窗口 N 内对价格/成交量的统计变换`;
}

function pickLabelHint(labels: string[]): string[] {
  const result: string[] = [];
  for (const label of labels) {
    const hint = LABEL_HINTS[label];
    if (!hint) {
      continue;
    }
    result.push(hint);
    if (result.length >= 2) {
      break;
    }
  }
  return result;
}

export function getIndicatorGuide(indicator: IndicatorDefinition): IndicatorGuide {
  const template = FAMILY_GUIDE[indicator.family];
  const labelHints = pickLabelHint(indicator.labels);

  return {
    quickIntro: `${template.quickPrefix}｜${indicator.name}：${indicator.description}。`,
    coreConcept: `${template.coreConcept} ${labelHints[0] ?? ""}`.trim(),
    readMethod: [...template.readMethod, ...(labelHints[1] ? [labelHints[1]] : [])],
    practicalWorkflow: template.practicalWorkflow,
    caution: template.caution,
    formula: resolveFormula(indicator),
    chartMode: template.chartMode,
    chartHint: template.chartHint,
  };
}
