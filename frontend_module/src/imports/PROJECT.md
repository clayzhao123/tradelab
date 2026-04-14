# tradelab 项目文档

> 本文件是项目的核心文档，用于快速理解项目的最新状态。

## 项目概述

**tradelab** 是一个 **Web 版 Crypto 策略实验台（Paper Trading）**，基于 Node.js + Express + SQLite 构建，支持实时行情、多币种扫描、风险管理和多指标策略评估。

### 核心能力
- 加密货币模拟交易（BTC、ETH、SOL、BNB、XRP、ADA、DOGE、AVAX、LINK、DOT、TRX、TON）
- 多时间框架扫描（1m、5m、15m、1H），基于多指标综合评分（Trend、MA Spread、RSI、Breakout、Pullback、Activity）
- 实时 WebSocket 推送（行情、订单、成交、扫描结果、风险事件）
- 风险控制（最大回撤、每日亏损、连续亏损、持仓限制、冷却时间）
- 幂等订单处理与事务一致性
- 调度器锁机制防止并发冲突

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端运行时 | Node.js (CommonJS) |
| Web 框架 | Express 5.2.1 |
| WebSocket | ws 8.20.0 |
| 数据库 | SQLite3 6.0.1（WAL 模式，外键启用） |
| 前端 | Vanilla JS SPA + HTML5 Canvas |
| 行情来源 | OKX 公共 API |

---

## 项目结构

```
tradelab/
├── server.js           # 后端：REST API + WebSocket + 调度器 + 行情
├── app.js              # 前端：SPA 状态管理 + Canvas 图表 + 策略扫描
├── index.html          # 单页入口
├── styles.css          # 样式文件
├── package.json        # 依赖与脚本
├── backend.schema.sql  # SQLite schema 定义
├── data/               # SQLite 数据库 (tradelab.db)
└── scripts/            # Smoke 测试脚本
```

---

## 架构模式

### 双模式运行
- **独立模式**：前端本地运行，使用模拟价格和 LocalStorage 持久化
- **后端同步模式**：前端通过 REST + WebSocket 连接后端，获取实时行情和持久化存储

### 前端状态
```javascript
state = {
  backendMode: false,           // 是否启用后端同步模式
  running: false,               // 运行状态
  prices: { BTC: {...}, ...},  // 当前价格
  history: {},                 // 历史数据
  klines: {},                  // K线数据 { symbol: { timeframe: [...] } }
  account: {                   // 账户状态
    cash, reservedCash, positions, orders, fills,
    riskEvents, trades, realizedPnlCum, unrealizedPnl,
    consecutiveLosses, equityCurve, flows, logs, events
  },
  scan: { results: [...] },     // 扫描结果
  cfg: { maShort, maLong, ... }, // 策略配置
}
```

---

## 数据库 Schema

### 核心表

| 表名 | 用途 |
|------|------|
| `orders` | 订单（symbol, side, type, status, qty, filled_qty, client_req_id） |
| `fills` | 成交记录（order_id, fill_qty, fill_price, realized_pnl） |
| `klines` | OHLCV K线数据（symbol, timeframe, t_open, open/high/low/close/volume） |
| `account_snapshots` | 周期性账户快照（cash, realized_pnl, unrealized_pnl, positions/orders/fills JSON） |
| `risk_events` | 风险事件记录 |
| `scan_results` | 扫描结果（symbol, score, direction, detail） |
| `scheduler_runs` | 调度器执行记录 |
| `system_logs` | 系统日志 |

---

## API 端点

### 健康与状态
- `GET /api/health` - 服务健康检查
- `GET /api/ws/status` - WebSocket 连接状态
- `GET /api/scheduler/status` - 调度器状态
- `GET /api/scheduler/runs` - 调度运行历史（分页）
- `GET /api/scheduler/summary` - 调度器摘要统计

### 行情
- `GET /api/market/quotes` - 当前价格
- `GET /api/klines/:symbol` - K线数据（支持 timeframe/sinceMinutes）

### 订单
- `GET /api/orders` - 订单列表（分页，支持 symbol/status/side/type 过滤）
- `GET /api/orders/:id` - 单个订单
- `POST /api/orders` - 创建订单（支持 client_req_id 幂等）
- `DELETE /api/orders/:id` - 取消订单（幂等）

### 扫描
- `GET /api/scan/results` - 扫描结果（分页，支持 minScore 过滤）

### 调度器控制
- `POST /api/scheduler/start` - 启动调度器
- `POST /api/scheduler/stop` - 停止调度器
- `POST /api/scheduler/trigger` - 手动触发一次调度
- `POST /api/scheduler/lock-probe` - 探测调度锁状态
- `POST /api/scheduler/force-unlock` - 强制解锁调度锁

### 状态
- `GET /api/state` - 全量状态快照

---

## WebSocket

### 路径
`/ws`

### 连接流程
1. 连接后收到 `hello`（运行时信息）+ `ws_snapshot`（全量状态）
2. 发送 `subscribe { types: [...] }` 或 `unsubscribe { types: [...] }`
3. 接收各类事件推送

### 事件类型（服务端→客户端）
| 事件 | 触发时机 |
|------|----------|
| `price_update` | 价格变化 |
| `scan_update` | 扫描完成 |
| `order_update` | 订单创建/更新 |
| `fill_update` | 成交记录 |
| `risk_event` | 风险规则触发 |

### 控制事件（始终推送）
`hello`, `ws_snapshot`, `ws_subscribed`, `pong`

---

## 调度系统

### 调度器（Scheduler）
- **间隔**：默认 60 秒（TICK_MS）
- **锁机制**：SQLite `BEGIN IMMEDIATE TRANSACTION` 防止并发
- **任务**：行情更新 + 多币种扫描 + 订单处理 + 风险检查
- **控制**：支持手动启动/停止/触发
- **监控**：支持锁状态探测和强制解锁

---

## 策略扫描

### 多因子评分（0-100）
| 因子 | 权重 | 说明 |
|------|------|------|
| Trend | 25% | 12 周期收益率 |
| MA Spread | 20% | 短期 MA vs 长期 MA |
| RSI | 15% | RSI 相对 58 中点位置 |
| Breakout | 15% | 距 20 周期高点距离 |
| Pullback | 10% | 从高点回撤 + MA 确认 |
| Activity | 10% | 短期 vs 长期成交量比 |
| Risk Penalty | - | ATR 高、RSI 超买、MA 弱等扣分 |

---

## 风险控制

| 规则 | 参数 | 说明 |
|------|------|------|
| 资金检查 | - | 预估成本 ≤ 现金 |
| 单币暴露 | `maxSymbolExposurePct` | 单币持仓 ≤ 比例 |
| 总暴露 | `maxGrossExposurePct` | 总持仓 ≤ 比例 |
| 冷却时间 | `cooldownSec` | 开仓后 N 秒内不能新开 |
| 连续亏损 | `maxConsecutiveLosses` | 连续亏损 N 次后禁止买入 |
| 每日亏损 | `maxDailyLossPct` | 日亏损超过阈值触发 |
| 最大回撤 | `maxDrawdownPct` | 权益从峰值跌破阈值触发 |

---

## 启动方式

```bash
# 安装依赖
npm install

# 启动后端（端口 3001）
npm start

# 或开发模式
npm run dev
```

### 测试脚本
```bash
npm test                     # 默认 scheduler lock 测试
npm run test:scheduler-lock   # 调度器锁测试
npm run test:scheduler-summary # 调度器摘要测试
npm run test:ws-subscription   # WebSocket 订阅测试
npm run test:paper-order      # 订单流程测试
npm run test:g6-t2            # G6-T2 重开仓位测试
npm run test:g7-idempotency   # G7 幂等性测试
npm run test:g7-core          # G7 核心流程测试
npm run test:g4-t3            # G4-T3 调度触发测试
```

---

## 开发进度

| Group | Task | Status |
|-------|------|--------|
| G1 基础架构 | G1-T1 ~ G1-T3 | ✅ 完成 |
| G2 交易持久化 | G2-T1 ~ G2-T3 | ✅ 完成 |
| G3 行情与K线 | G3-T1 ~ G3-T3 | ✅ 完成 |
| G4 调度任务 | G4-T1 ~ G4-T4 | ✅ 完成 |
| G5 API与WS | G5-T1 ~ G5-T2 | ✅ 完成 |
| G6 前端改造 | G6-T1 ~ G6-T2 | ✅ 完成 |
| G7 稳定化 | G7-T1 ~ G7-T3 | ✅ 完成 |
| G8 UI优化 | G8-T1 ~ G8-T3 | ✅ 完成 |

最新提交：`b05dff4` (2026-03-28 14:31:03)

---

## 环境变量（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3001 | 服务端口 |
| `TICK_MS` | 60000 | 调度器间隔（ms） |
| `OKX_TIMEOUT_MS` | 4000 | OKX API 超时（ms） |
| `OKX_MAX_RETRIES` | 2 | OKX API 最大重试次数 |
| `OKX_RETRY_BACKOFF_MS` | 250 | OKX API 重试退避（ms） |
| `SCHEDULER_LOCK_TIMEOUT_MS` | 180000 | 调度器锁超时（ms） |
| `SCHEDULER_AUTO_FORCE_UNLOCK` | - | 允许自动强制解锁 |
| `PAPER_FILL_MIN_RATIO` | 0.25 | 模拟成交最小比例 |
| `PAPER_FILL_MAX_RATIO` | 0.7 | 模拟成交最大比例 |
| `PAPER_MIN_FILL_QTY` | 0.0001 | 模拟最小成交数量 |
| `DB_PATH` | data/tradelab.db | 数据库路径 |
