# tradelab - Crypto Paper Trading Lab

tradelab 是一个 **Web 版加密货币模拟交易实验台**，支持 AI 策略融合、实时行情监控、智能扫描和回测功能。

![tradelab](https://img.shields.io/badge/version-v2.4.0-blue) ![React](https://img.shields.io/badge/React-18.2-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 功能特性

### 1. AI 融合策略引擎 (Indicator Fusion Lab)

传统指标组合依赖经验，而 tradelab 的 AI 融合引擎可以将多个基础技术指标智能组合，生成高性能自定义策略。

```
支持的基础指标:
├── RSI (Relative Strength Index)      - 动量指标
├── MACD (Moving Average Convergence)  - 趋势指标
├── Bollinger Bands                    - 波动率指标
├── EMA Cross                          - 趋势指标
├── ATR (Average True Range)            - 波动率指标
├── Stochastic                          - 动量指标
├── Volume Profile                      - 成交量指标
└── OBV (On-Balance Volume)           - 成交量指标
```

**融合流程:**

```svg
<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Base Indicators -->
  <rect x="10" y="30" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.8"/>
  <text x="50" y="50" fill="white" font-size="11" text-anchor="middle">RSI</text>

  <rect x="10" y="70" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.8"/>
  <text x="50" y="90" fill="white" font-size="11" text-anchor="middle">MACD</text>

  <rect x="10" y="110" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.8"/>
  <text x="50" y="130" fill="white" font-size="11" text-anchor="middle">Bollinger</text>

  <rect x="10" y="150" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.8"/>
  <text x="50" y="170" fill="white" font-size="11" text-anchor="middle">ATR</text>

  <!-- Arrows -->
  <line x1="95" y1="45" x2="180" y2="90" stroke="#6366f1" stroke-width="2" stroke-dasharray="4"/>
  <line x1="95" y1="85" x2="180" y2="90" stroke="#6366f1" stroke-width="2" stroke-dasharray="4"/>
  <line x1="95" y1="125" x2="180" y2="90" stroke="#6366f1" stroke-width="2" stroke-dasharray="4"/>
  <line x1="95" y1="165" x2="180" y2="90" stroke="#6366f1" stroke-width="2" stroke-dasharray="4"/>

  <!-- AI Fusion Chamber -->
  <rect x="200" y="50" width="160" height="80" rx="8" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
  <text x="280" y="85" fill="#a5b4fc" font-size="12" text-anchor="middle">AI FUSION</text>
  <text x="280" y="105" fill="#a5b4fc" font-size="12" text-anchor="middle">CHAMBER</text>
  <circle cx="280" cy="75" r="8" fill="#6366f1" opacity="0.6">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
  </circle>

  <!-- Output Arrow -->
  <line x1="365" y1="90" x2="430" y2="90" stroke="#22c55e" stroke-width="3"/>

  <!-- Strategy Result -->
  <rect x="440" y="40" width="150" height="100" rx="6" fill="#052e16" stroke="#22c55e" stroke-width="2"/>
  <text x="515" y="70" fill="#22c55e" font-size="12" font-weight="bold" text-anchor="middle">RSI-MACD</text>
  <text x="515" y="85" fill="#22c55e" font-size="12" font-weight="bold" text-anchor="middle">Alpha Matrix</text>
  <text x="515" y="110" fill="#86efac" font-size="16" font-weight="bold" text-anchor="middle">Score: 92</text>
</svg>
```

**AI 融合特点:**
- 最多同时选择 5 个指标进行融合
- 智能分析指标间的相关性
- 自动生成策略逻辑说明
- 输出策略评分 (0-100)

---

### 2. 回测引擎 (Backtest Engine)

在历史数据上验证融合策略的有效性，支持多币种、多时间框架回测。

```svg
<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg">
  <!-- Grid -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="500" height="250" fill="url(#grid)"/>

  <!-- Equity Curve -->
  <path d="M 30 200 Q 80 180, 120 170 T 200 140 T 280 120 T 360 80 T 450 50"
        fill="none" stroke="#22c55e" stroke-width="3"/>
  <path d="M 30 200 Q 80 180, 120 170 T 200 140 T 280 120 T 360 80 T 450 50 L 450 220 L 30 220 Z"
        fill="url(#equityGrad)" opacity="0.3"/>

  <defs>
    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Labels -->
  <text x="30" y="30" fill="#22c55e" font-size="14" font-weight="bold">+124.5% Total Return</text>
  <text x="30" y="50" fill="#94a3b8" font-size="11">Win Rate: 68.2% | Max DD: -12.4% | Trades: 1,432</text>

  <!-- Pair Performance Bars -->
  <rect x="30" y="180" width="100" height="12" rx="2" fill="#3b82f6" opacity="0.6"/>
  <text x="140" y="190" fill="#3b82f6" font-size="10">BTC/USDT: +45.2%</text>

  <rect x="30" y="200" width="40" height="12" rx="2" fill="#8b5cf6" opacity="0.6"/>
  <text x="80" y="210" fill="#8b5cf6" font-size="10">ETH/USDT: +12.1%</text>
</svg>
```

**回测指标:**
- 总收益率 (Total Return)
- 胜率 (Win Rate)
- 最大回撤 (Max Drawdown)
- 总交易次数 (Total Trades)
- 权益曲线 (Equity Curve)

---

### 3. 实时行情监控 (Live Dashboard)

```svg
<svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg">
  <!-- Candlestick Chart Area -->
  <rect x="10" y="10" width="400" height="120" rx="4" fill="#0f172a" stroke="#334155"/>
  <text x="20" y="30" fill="#94a3b8" font-size="11">BTC / USD</text>

  <!-- Candlesticks -->
  <g transform="translate(60, 40)">
    <!-- Candle 1-5 -->
    <line x1="10" y1="15" x2="10" y2="5" stroke="#22c55e" stroke-width="1"/>
    <rect x="5" y="15" width="10" height="20" fill="#22c55e" rx="1"/>
    <line x1="35" y1="25" x2="35" y2="10" stroke="#22c55e" stroke-width="1"/>
    <rect x="30" y="10" width="10" height="15" fill="#22c55e" rx="1"/>
    <line x1="60" y1="20" x2="60" y2="12" stroke="#ef4444" stroke-width="1"/>
    <rect x="55" y="12" width="10" height="8" fill="#ef4444" rx="1"/>
    <line x1="85" y1="22" x2="85" y2="8" stroke="#22c55e" stroke-width="1"/>
    <rect x="80" y="8" width="10" height="14" fill="#22c55e" rx="1"/>
    <line x1="110" y1="18" x2="110" y2="6" stroke="#22c55e" stroke-width="1"/>
    <rect x="105" y="6" width="10" height="12" fill="#22c55e" rx="1"/>
  </g>

  <!-- Sidebar Watchlist -->
  <rect x="420" y="10" width="170" height="120" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="430" y="30" fill="#64748b" font-size="10" font-weight="bold">WATCHLIST</text>

  <g transform="translate(430, 45)">
    <text x="0" y="0" fill="#f8fafc" font-size="11">BTC</text>
    <text x="80" y="0" fill="#f8fafc" font-size="11">43,280</text>
    <text x="140" y="0" fill="#22c55e" font-size="10">+2.34%</text>

    <text x="0" y="18" fill="#f8fafc" font-size="11">ETH</text>
    <text x="80" y="18" fill="#f8fafc" font-size="11">2,314</text>
    <text x="140" y="18" fill="#22c55e" font-size="10">+1.12%</text>

    <text x="0" y="36" fill="#f8fafc" font-size="11">SOL</text>
    <text x="80" y="36" fill="#f8fafc" font-size="11">108.45</text>
    <text x="140" y="36" fill="#ef4444" font-size="10">-0.54%</text>

    <text x="0" y="54" fill="#f8fafc" font-size="11">AVAX</text>
    <text x="80" y="54" fill="#f8fafc" font-size="11">35.60</text>
    <text x="140" y="54" fill="#22c55e" font-size="10">+5.40%</text>
  </g>

  <!-- Scan Results -->
  <rect x="10" y="140" width="580" height="35" rx="4" fill="#1e293b" stroke="#334155"/>
  <text x="20" y="162" fill="#64748b" font-size="10" font-weight="bold">SCAN RESULTS</text>
  <text x="130" y="162" fill="#22c55e" font-size="11">BTC: 85 LONG</text>
  <text x="230" y="162" fill="#22c55e" font-size="11">ETH: 72 LONG</text>
  <text x="330" y="162" fill="#94a3b8" font-size="11">SOL: 65 NEUTRAL</text>
  <text x="450" y="162" fill="#ef4444" font-size="11">DOGE: 42 SHORT</text>
</svg>
```

**监控功能:**
- 多币种实时价格 (BTC, ETH, SOL, BNB, DOGE, AVAX, LINK, DOT)
- K 线图表 (支持 1m, 5m, 15m, 1H 时间框架)
- 智能扫描评分 (0-100)
- 交易方向信号 (LONG / SHORT / NEUTRAL)

---

### 4. 订单管理 (Orders & Activity)

```svg
<svg viewBox="0 0 600 150" xmlns="http://www.w3.org/2000/svg">
  <!-- Order Table -->
  <rect x="10" y="10" width="580" height="30" rx="4" fill="#1e293b"/>
  <text x="25" y="28" fill="#64748b" font-size="10">STATUS</text>
  <text x="100" y="28" fill="#64748b" font-size="10">SIDE</text>
  <text x="160" y="28" fill="#64748b" font-size="10">SYMBOL</text>
  <text x="230" y="28" fill="#64748b" font-size="10">QTY</text>
  <text x="300" y="28" fill="#64748b" font-size="10">FILLED</text>
  <text x="380" y="28" fill="#64748b" font-size="10">PRICE</text>
  <text x="460" y="28" fill="#64748b" font-size="10">P&L</text>

  <!-- Order Row 1 -->
  <rect x="10" y="45" width="580" height="30" rx="0" fill="#0f172a"/>
  <rect x="25" y="52" width="55" height="16" rx="3" fill="#22c55e" opacity="0.2"/>
  <text x="52" y="64" fill="#22c55e" font-size="9" text-anchor="middle">PARTIAL</text>
  <text x="100" y="64" fill="#22c55e" font-size="10" font-weight="bold">↑ BUY</text>
  <text x="160" y="64" fill="#f8fafc" font-size="10">BTC</text>
  <text x="230" y="64" fill="#94a3b8" font-size="10">0.12</text>
  <text x="300" y="64" fill="#94a3b8" font-size="10">0.05</text>
  <text x="380" y="64" fill="#f8fafc" font-size="10">$43,280</text>
  <text x="460" y="64" fill="#22c55e" font-size="10">+$12.40</text>

  <!-- Order Row 2 -->
  <rect x="10" y="75" width="580" height="30" rx="0" fill="#1e293b"/>
  <rect x="25" y="82" width="45" height="16" rx="3" fill="#f59e0b" opacity="0.2"/>
  <text x="47" y="94" fill="#f59e0b" font-size="9" text-anchor="middle">OPEN</text>
  <text x="100" y="94" fill="#ef4444" font-size="10" font-weight="bold">↓ SELL</text>
  <text x="160" y="94" fill="#f8fafc" font-size="10">ETH</text>
  <text x="230" y="94" fill="#94a3b8" font-size="10">2.50</text>
  <text x="300" y="94" fill="#94a3b8" font-size="10">0.00</text>
  <text x="380" y="94" fill="#f8fafc" font-size="10">$2,350</text>
  <text x="460" y="94" fill="#94a3b8" font-size="10">—</text>

  <!-- Order Row 3 -->
  <rect x="10" y="105" width="580" height="30" rx="0" fill="#0f172a"/>
  <rect x="25" y="112" width="45" height="16" rx="3" fill="#22c55e" opacity="0.2"/>
  <text x="47" y="124" fill="#22c55e" font-size="9" text-anchor="middle">FILLED</text>
  <text x="100" y="124" fill="#22c55e" font-size="10" font-weight="bold">↑ BUY</text>
  <text x="160" y="124" fill="#f8fafc" font-size="10">SOL</text>
  <text x="230" y="124" fill="#94a3b8" font-size="10">15.00</text>
  <text x="300" y="124" fill="#94a3b8" font-size="10">15.00</text>
  <text x="380" y="124" fill="#f8fafc" font-size="10">$105.20</text>
  <text x="460" y="124" fill="#ef4444" font-size="10">-$4.50</text>
</svg>
```

**订单功能:**
- 订单状态追踪 (OPEN / PARTIAL / FILLED / CANCELLED)
- 多维度筛选和搜索
- 实时盈亏统计
- 订单导出 (CSV)

---

### 5. Bot 部署 (Bot Deployment)

```svg
<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Config Panel -->
  <rect x="10" y="10" width="480" height="180" rx="8" fill="#1e293b" stroke="#334155"/>

  <!-- Bot Icon -->
  <circle cx="80" cy="50" r="25" fill="#0f172a" stroke="#22c55e" stroke-width="2"/>
  <text x="80" y="56" text-anchor="middle" fill="#22c55e" font-size="20">🤖</text>
  <circle cx="100" cy="35" r="5" fill="#22c55e">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
  </circle>

  <text x="250" y="45" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle">Deploy Trading Bot</text>
  <text x="250" y="65" fill="#64748b" font-size="11" text-anchor="middle">Configure parameters and launch your automated strategy</text>

  <!-- Parameters -->
  <text x="30" y="95" fill="#64748b" font-size="10">STRATEGY</text>
  <rect x="30" y="102" width="140" height="28" rx="4" fill="#0f172a" stroke="#334155"/>
  <text x="100" y="120" fill="#f8fafc" font-size="11" text-anchor="middle">RSI-MACD Alpha</text>

  <text x="190" y="95" fill="#64748b" font-size="10">TRADE SIZE</text>
  <rect x="190" y="102" width="70" height="28" rx="4" fill="#0f172a" stroke="#334155"/>
  <text x="225" y="120" fill="#f8fafc" font-size="11" text-anchor="middle">5%</text>

  <text x="280" y="95" fill="#64748b" font-size="10">LEVERAGE</text>
  <rect x="280" y="102" width="70" height="28" rx="4" fill="#0f172a" stroke="#334155"/>
  <text x="315" y="120" fill="#f8fafc" font-size="11" text-anchor="middle">1x</text>

  <text x="370" y="95" fill="#ef4444" font-size="10">STOP LOSS</text>
  <rect x="370" y="102" width="60" height="28" rx="4" fill="#0f172a" stroke="#ef4444"/>
  <text x="400" y="120" fill="#ef4444" font-size="11" text-anchor="middle">2.5%</text>

  <text x="445" y="95" fill="#22c55e" font-size="10">TAKE PROFIT</text>
  <rect x="445" y="102" width="60" height="28" rx="4" fill="#0f172a" stroke="#22c55e"/>
  <text x="475" y="120" fill="#22c55e" font-size="11" text-anchor="middle">5.0%</text>

  <!-- Deploy Button -->
  <rect x="30" y="145" width="440" height="35" rx="6" fill="#22c55e"/>
  <text x="250" y="168" fill="white" font-size="13" font-weight="bold" text-anchor="middle">▶ DEPLOY & START BOT</text>
</svg>
```

**部署参数:**
- 策略选择
- 交易规模 (% of Equity)
- 杠杆倍数 (1x-5x)
- 止损/止盈设置
- 每日最大回撤限制

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│Dashboard│ Orders   │ Strategy │ Backtest │ Runner   │ History  │
│         │          │ Lab      │ Engine   │          │          │
└────┬────┴────┬─────┴────┬─────┴────┬─────┴────┬────┴────┬──────┘
     │         │         │         │         │         │
     └─────────┴─────────┴─────────┴─────────┴─────────┘
                              │ WebSocket + REST API
┌─────────────────────────────┴───────────────────────────────────┐
│                    Backend (Node.js + Express)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ REST API    │  │ WebSocket    │  │ Scheduler (60s interval) │ │
│  │ /api/*      │  │ Server       │  │ - Market Data Update    │ │
│  │             │  │              │  │ - Multi-coin Scan       │ │
│  │             │  │              │  │ - Order Processing      │ │
│  │             │  │              │  │ - Risk Checks           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    Database (SQLite3 - WAL Mode)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Orders   │ │ Fills    │ │ Klines   │ │ Account  │ │ Risk   │ │
│  │          │ │          │ │          │ │ Snapshots│ │ Events │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    Market Data (OKX Public API)                  │
│  GET /api/v5/market/ticker    GET /api/v5/market/candles        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 样式方案 | Tailwind CSS |
| 后端框架 | Express 5.x |
| WebSocket | ws 8.x |
| 数据库 | SQLite3 (WAL 模式) |
| 行情来源 | OKX 公共 API |

---

## 页面导航

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Live Dashboard | 实时行情监控 + 扫描结果 |
| `/orders` | Orders & Activity | 订单管理 + 历史成交 |
| `/strategy` | Strategy Lab | AI 指标融合策略创建 |
| `/backtest` | Backtest Engine | 策略历史回测 |
| `/runner` | Bot Deployment | 量化 Bot 部署控制 |
| `/history` | Session History | 历史运行记录回顾 |

---

## 核心模块

### 策略扫描 (Multi-Factor Scoring)

| 因子 | 权重 | 说明 |
|------|------|------|
| Trend | 25% | 12 周期收益率 |
| MA Spread | 20% | 短期 MA vs 长期 MA |
| RSI | 15% | RSI 相对 58 中点位置 |
| Breakout | 15% | 距 20 周期高点距离 |
| Pullback | 10% | 从高点回撤 + MA 确认 |
| Activity | 10% | 短期 vs 长期成交量比 |
| Risk Penalty | - | ATR 高、RSI 超买、MA 弱等扣分 |

### 风险控制

| 规则 | 说明 |
|------|------|
| 资金检查 | 预估成本 ≤ 现金 |
| 单币暴露 | 单币持仓 ≤ `maxSymbolExposurePct` |
| 总暴露 | 总持仓 ≤ `maxGrossExposurePct` |
| 冷却时间 | 开仓后 N 秒内不能新开 |
| 连续亏损 | 连续亏损 N 次后禁止买入 |
| 每日亏损 | 日亏损超过阈值触发保护 |
| 最大回撤 | 权益从峰值跌破阈值触发 |

---

## 启动方式

```bash
# 安装依赖
npm install

# 启动后端 (端口 3001)
npm start

# 或开发模式 (热重载)
npm run dev
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3001 | 服务端口 |
| `TICK_MS` | 60000 | 调度器间隔 (ms) |
| `OKX_TIMEOUT_MS` | 4000 | OKX API 超时 |
| `PAPER_FILL_MIN_RATIO` | 0.25 | 模拟成交最小比例 |
| `PAPER_FILL_MAX_RATIO` | 0.7 | 模拟成交最大比例 |
| `DB_PATH` | data/tradelab.db | 数据库路径 |

---

## API 端点

### 行情
- `GET /api/market/quotes` - 当前价格
- `GET /api/klines/:symbol` - K 线数据

### 订单
- `GET /api/orders` - 订单列表
- `POST /api/orders` - 创建订单
- `DELETE /api/orders/:id` - 取消订单

### 调度器
- `POST /api/scheduler/start` - 启动调度器
- `POST /api/scheduler/stop` - 停止调度器
- `POST /api/scheduler/trigger` - 手动触发一次调度

---

## WebSocket 事件

| 事件 | 说明 |
|------|------|
| `price_update` | 价格变化推送 |
| `scan_update` | 扫描完成推送 |
| `order_update` | 订单创建/更新 |
| `fill_update` | 成交记录 |
| `risk_event` | 风险规则触发 |

---

## 开发进度

| Group | 任务 | 状态 |
|-------|------|------|
| G1 | 基础架构 | ✅ 完成 |
| G2 | 交易持久化 | ✅ 完成 |
| G3 | 行情与 K 线 | ✅ 完成 |
| G4 | 调度任务 | ✅ 完成 |
| G5 | API 与 WebSocket | ✅ 完成 |
| G6 | 前端改造 | ✅ 完成 |
| G7 | 稳定化 | ✅ 完成 |
| G8 | UI 优化 | ✅ 完成 |
