# TradeLab 开发与接口参考

这里收纳主 README 不需要展开的技术信息。应用技术栈：React 19、TypeScript 5.9、Vite 8、Tailwind CSS 4；后端 Fastify 5，自定义 WebSocket 网关。

## 入口与业务链路

| 修改对象 | 前端入口 | 后端入口 |
|---|---|---|
| 行情与扫描 | `app/pages/Dashboard.tsx`、`app/contexts/DataContext.tsx` | `modules/market/`、`modules/scanner/` |
| 策略与 AI | `app/pages/Strategy.tsx`、`app/components/strategy/` | `modules/strategies/`、`modules/ai/` |
| 历史回测 | `app/pages/Backtest.tsx`、`app/components/backtest/` | `modules/backtest/`、`repositories/backtest.repository.ts` |
| 订单与账户 | `app/pages/Orders.tsx`、`app/contexts/DataContext.tsx` | `modules/orders/`、`modules/account/`、`modules/risk/` |
| 会话与历史 | `app/pages/BotRunner.tsx`、`app/pages/History.tsx` | `modules/runs/`、`modules/history/` |
| API 与实时同步 | `shared/api/client.ts`、`shared/realtime/wsClient.ts` | `app/register-routes.ts`、`modules/ws/` |

前端路径以 `frontend/src/` 为起点；后端路径以 `backend/src/` 为起点。后端服务与存储的组装入口为 [create-app.ts](../backend/src/app/create-app.ts)。

修改前端写操作时，同时核对后端 route/schema/service、失败响应和 WS 更新；已有协作背景见 [工作流说明](../skill/frontend-backend-workflow/SKILL.md)。

## 常用命令

在仓库根目录执行：

```bash
npm run dev
npm test
npm run build
npm run lint --workspace frontend
```

分两个终端运行时分别使用 `npm run dev --workspace frontend` 与 `npm run dev --workspace backend`。根目录没有 `npm start`；后端构建后可用 `npm run start --workspace backend`。前端 `preview` 仅预览构建文件，连接后端仍需设置地址或代理。

后端已启动后，另开终端执行 `npm run smoke:v1`。前端 `test:build` 输出到 `frontend/.tmp-tests/`，这些文件是可再生成的产物，不作为源码提交。

## 连接与配置

开发时，空的 `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` 使用 Vite 的 `/api` 与 `/ws` 代理，目标为本机 3001。修改后端端口时同时更新 [vite.config.ts](../frontend/vite.config.ts)。

| 后端配置 | 默认值/用途 |
|---|---|
| `HOST / PORT` | `0.0.0.0 / 3001`；本地演示可将 HOST 设为 `127.0.0.1` |
| `MARKET_DATA_PROVIDER` | `real`；首次演示显式设为 `mock` |
| `DATABASE_URL` | env.ts 默认空，示例文件有连接串；实际启用仍需依赖与迁移 |
| `WS_PATH` | `/ws`；前端客户端当前将路径写为 `/ws`，改后端路径需同步改前端 |
| `WS_HEARTBEAT_INTERVAL_MS` | `15000` |
| `MINIMAX_OPENAI_BASE_URL` | 默认 `https://api.minimaxi.com/v1`；需与密钥来源匹配 |

[后端配置示例](../backend/.env.example) · [前端配置示例](../frontend/.env.example)。AI model/key 通过页面和 `/api/v1/ai/config` 保存，不把真实密钥放进 README。

## 常用 API

业务前缀为 `/api/v1`。本表列常用路径，不是完整的参数规范；参数与验证逻辑见 [modules/](../backend/src/modules/) 中各 `*.routes.ts`。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/api/v1/system/status` | 系统状态 |
| GET | `/api/v1/market/watchlist` | 观察列表 |
| GET | `/api/v1/quotes` | 行情 |
| GET | `/api/v1/klines` | K 线 |
| GET / POST | `/api/v1/strategies` | 列出/创建策略 |
| PATCH / DELETE | `/api/v1/strategies/:id` | 更新/删除策略 |
| GET / PUT | `/api/v1/ai/config` | 读取/保存 AI 设置 |
| POST | `/api/v1/ai/fusion/generate` | AI 策略建议 |
| POST | `/api/v1/backtest/run` | 运行回测 |
| GET | `/api/v1/backtest/history` | 回测历史 |
| GET / DELETE | `/api/v1/backtest/history/:id` | 回测详情/删除 |
| GET / POST | `/api/v1/orders` | 列出/创建模拟订单 |
| DELETE | `/api/v1/orders/:id` | 取消订单 |
| GET | `/api/v1/fills` | 模拟成交 |
| GET | `/api/v1/runs` | 列出会话 |
| POST | `/api/v1/runs/start` | 开始会话 |
| POST | `/api/v1/runs/:id/stop` | 停止会话 |

默认 WebSocket 为 `ws://localhost:3001/ws`。先处理 `snapshot`，再应用 `dashboard.updated`、`order.updated`、`fill.created`、`run.updated`、`account.updated` 和 `risk.triggered` 等事件。序号、重连及消息结构见 [WebSocket 合约](websocket-contract.md)。

## 数据边界

策略、AI 设置与回测历史通过 repositories 存储：无 PostgreSQL client 时，非测试环境使用 `backend/.data/` 文件，测试环境回退内存。其他账户、订单、成交和会话仍使用 MemoryDb。具体边界与重启行为见 [运行手册](runbook.md#5-数据保存与重启)。

当前代码的重点整理方向见 [结构审查](project-review.md)。不要仅根据 `database/` 目录或界面按钮推断持久化、自动交易或部署已完成。
