# Strategy Lab + Backtest Persistence Upgrade

## Summary

- 当前回测结果确实没有后端持久化；`POST /api/v1/backtest/run` 现在是“现算现返”，刷新后丢失。
- 这次统一改为用 PostgreSQL 持久化三类核心数据：策略、AI 配置、回测历史。
- 回测历史放在 Backtest 页面内新增一个 `Backtest History` 区域；点击任意条目时，直接从数据库读取当次回测的完整明细并“再展现”，不重新计算。
- `MemoryDb` 不会立刻废弃，但会缩到“运行态临时数据”范围：`run`、`order`、`fill`、`account`、`risk`、`scan`、实时 market 这批暂时仍可留在内存；策略、AI 配置、回测历史不再以它为主存。

## Implementation Changes

### 1. PostgreSQL scope

- 使用同一套 PostgreSQL、同一套迁移体系，和现有 `database/schema.sql` 保持一致，不单独引入新数据库技术。
- 本次接入范围固定为：
  - `strategies`
  - `ai_provider_settings`
  - `backtest_runs`
  - `backtest_symbol_results`
  - `backtest_portfolio_points`
  - `backtest_symbol_price_points`
  - `backtest_symbol_trade_return_points`
  - `backtest_symbol_trade_markers`
- 不在本次范围内：
  - `runs`、`orders`、`fills`、`account_snapshots`、`risk_events` 全量迁移
  - 用 PostgreSQL 取代全部 MemoryDb 运行态能力

### 2. Strategy persistence

- 现有策略 CRUD 改为走 PostgreSQL 仓储，不再以 `MemoryDb.strategies` 为权威来源。
- `strategies.params.fusion` 继续保留灵活 JSONB 结构，并新增统一元数据：
  - `origin: "manual" | "ai_prompt" | "ai_selected"`
  - `ai.provider`
  - `ai.model`
  - `ai.totalScore`
  - `ai.radar`
  - `ai.introduction`
- Strategy Lab 中无论是手动融合还是 AI 融合，最终确认创建后都写入同一张 `strategies` 表。
- 删除策略仍走现有删除入口，但底层删除 PostgreSQL 中的策略记录。

### 3. AI config + AI fusion

- 新增全局单份配置表 `ai_provider_settings`：
  - `provider` 唯一，V1 固定 `minimax`
  - `api_key`
  - `model`
  - `created_at`
  - `updated_at`
- 新增接口：
  - `GET /api/v1/ai/config`
  - `PUT /api/v1/ai/config`
  - `POST /api/v1/ai/fusion/generate`
- AI prompt 固定在后端，前端不编辑完整 prompt。
- AI 融合支持两种模式：
  - `prompt`：自然语言生成指标组合
  - `selected`：对已选指标做二次融合
- `AI Result Panel` 固定输出：
  - 单一综合评分 `totalScore`
  - 五维雷达图
    - `returnPotential`
    - `robustness`
    - `riskControl`
    - `explainability`
    - `marketFit`
  - 策略名称建议
  - 融合介绍
  - 指标权重与理由
- 前端仍然是“AI 结果先回填草稿，再由用户确认创建策略”。

### 4. Backtest persistence

- `POST /api/v1/backtest/run` 改为：
  - 先执行回测
  - 再把当次结果持久化到 PostgreSQL
  - 返回 `backtestRunId + full detail`
- 新增回测历史接口：
  - `GET /api/v1/backtest/history`
  - `GET /api/v1/backtest/history/:id`
- 存储结构采用“拆表明细”，用于完整回放：
  - `backtest_runs`
    - 一次回测的主记录
    - 保存 strategy 关联、策略快照、请求参数、portfolio summary、decision threshold、generatedAt
  - `backtest_symbol_results`
    - 每个 symbol 的 summary 指标
  - `backtest_portfolio_points`
    - 组合净值曲线
  - `backtest_symbol_price_points`
    - 单 symbol 价格曲线
  - `backtest_symbol_trade_return_points`
    - 单 symbol trade return curve
  - `backtest_symbol_trade_markers`
    - 买卖点和连线关系
- “再展现”定义为：
  - 读取 `GET /api/v1/backtest/history/:id`
  - 直接恢复成当前 Backtest 页现有的 result 结构
  - 不重新获取市场数据，不重新跑计算

## Frontend Changes

### 1. Strategy Lab

- 在 `frontend/src/app/pages/Strategy.tsx` 内新增 `AI Fusion` 区域。
- `AI Result Panel` 增加：
  - 单一综合分卡片
  - 五维雷达图
  - 融合说明
  - 应用到草稿按钮
- Persisted Strategies 列表显示来源标签：
  - `Manual`
  - `AI Prompt`
  - `AI Enhanced`

### 2. Backtest page

- 在 `frontend/src/app/pages/Backtest.tsx` 中新增 `Backtest History` 区域。
- 历史列表每条至少展示：
  - 回测时间
  - 策略名 / Custom
  - timeframe
  - symbols 数量
  - portfolio return
  - max drawdown
  - sharpe
- 点击历史条目后：
  - 从后端读取完整 detail
  - 直接替换当前页面 `result`
  - 同步恢复 `activeSymbol`、`treemap`、detail card 的默认选中状态
- 当前 “Run Backtest” 按钮逻辑不变，但成功后结果会自动进入历史列表。

## API / Type Changes

- `Strategy` 继续复用现有结构，但 `params.fusion` 约定新增 AI 元数据字段。
- `BacktestResult` 增加 `backtestRunId`。
- 新增 `BacktestHistorySummary`：
  - `id`
  - `generatedAt`
  - `strategyId`
  - `strategyName`
  - `timeframe`
  - `lookbackBars`
  - `initialCapital`
  - `symbolsCount`
  - `portfolio.totalReturnPct`
  - `portfolio.maxDrawdownPct`
  - `portfolio.sharpe`
- 新增 `BacktestHistoryDetail`：
  - 结构尽量贴近当前 `BacktestResult`
  - 额外包含 `id` 与请求参数快照

## Data / Repository Design

- 新增 PostgreSQL repositories：
  - `StrategyRepository`
  - `AiSettingsRepository`
  - `BacktestRepository`
- `RunsService` 和 `BacktestService` 中凡是按 `strategyId` 取策略的地方，统一改走 `StrategyRepository`。
- `MemoryDb` 后续保留为临时运行态容器，但去掉“策略/回测持久化职责”。
- 默认 seed strategy 若还需要，改放到 SQL seed，而不是 `MemoryDb` constructor。

## Test Plan

- Backend
  - PostgreSQL 策略 CRUD
  - AI 配置保存/读取/masked 回显
  - AI 生成结构校验与非法输出兜底
  - 回测执行后自动写入所有 `backtest_*` 表
  - `GET /api/v1/backtest/history` 和 `GET /api/v1/backtest/history/:id` 能完整重建结果
  - `RunsService` / `BacktestService` 从 PostgreSQL 读取策略成功
- Frontend
  - AI Result Panel 展示综合分和五维雷达图
  - AI 结果应用草稿后，手动创建策略成功
  - Backtest 成功后历史列表立即出现新记录
  - 点击历史条目后可完整再展现 `treemap`、portfolio curve、symbol detail
  - 页面刷新后历史仍可读

## Assumptions

- PostgreSQL 是本次策略、AI 配置、回测历史的统一持久化数据库。
- 回测历史第一版默认“只读不删”；如果后面需要删除，再追加删除接口。
- 运行态数据暂不整体迁移，MemoryDb 仍保留，但会从“总数据库”降级为“临时运行态存储”。
- 雷达图五维分数由 AI 生成并由后端校验为 `0-100` 数值。
