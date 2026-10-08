# TradeLab 本地运行手册

本手册用于启动当前 `frontend/` 与 `backend/` 两个 workspace。它是模拟交易实验环境：有行情、策略、回测和模拟订单；运行会话目前尚未包含完整的自动下单循环。

## 1. 安装依赖

安装 Git、npm 和满足 Vite 8 要求的 Node.js，例如 Node 22.12+ 或受支持的更高版本。在仓库根目录执行：

```bash
npm ci
```

## 2. 准备配置

macOS / Linux：

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Windows PowerShell：

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

首次演示将 `backend/.env` 改为：

```dotenv
HOST=127.0.0.1
DATABASE_URL=
MARKET_DATA_PROVIDER=mock
```

保留其他默认项即可。`frontend/.env` 的 API/WS 地址可留空，开发代理会连接本机 3001 端口。配置变更后重启对应服务。

选择 `real` 会使用 Binance 行情与 CoinGecko 市值信息，但请求失败时可能回退缓存或 mock；页面有数据不等于当前实时行情。手动策略不需要 AI。AI 策略建议需要在页面配置 MiniMax API key 与 model，并让 `MINIMAX_OPENAI_BASE_URL` 与密钥来源匹配，示例见 [后端环境配置](../backend/.env.example)。

## 3. 启动与基本确认

```bash
npm run dev
```

在根目录执行以上命令，同时启动前后端。默认打开 http://localhost:5173；访问 http://localhost:3001/health 确认后端可达，访问 http://localhost:3001/api/v1/system/status 查看系统状态。

需要分开启动时，在两个终端分别运行：

```bash
npm run dev --workspace backend
npm run dev --workspace frontend
```

根目录没有 `npm start`。`npm run start --workspace backend` 只适用于已构建的后端，不会同时启动前端。

## 4. 走一遍实验流程

1. Dashboard：检查行情、观察列表和 K 线。
2. Strategy Lab：手动选择指标、设置权重并保存；AI 为可选路径。
3. Backtest：选择策略、币种和历史区间，检查结果。
4. Orders：创建模拟订单，观察订单、成交和账户变化。
5. Runner / History：创建、停止并查看会话；同时只允许一个 active run。

WebSocket 默认为 `ws://localhost:3001/ws`，首次连接先接收 `snapshot`，之后应用增量事件。消息字段与重连处理见 [WebSocket 合约](websocket-contract.md)。

## 5. 数据保存与重启

| 数据 | 当前行为 |
|---|---|
| 策略、AI 设置、回测历史 | 无 PostgreSQL 客户端时，非测试环境使用 `backend/.data/` JSON 文件 |
| 订单、成交、账户、运行会话及相关运行历史 | 使用内存；后端重启后不应期待保留 |
| 测试环境中的 repository 回退 | 使用内存 |

PostgreSQL 为可选 repository 路径。当前 `backend/package.json` 未声明 `pg`，因此只设置 `DATABASE_URL` 不足以保证连接成功。启用前需补充该依赖、建立数据库并执行 `database/` 中的迁移，确认连接日志后再验证读写；这也不会自动将其他内存业务迁移到数据库。

`backend/.data/` 中的 AI 设置可能含密钥。备份时应谨慎处理这些设置；不要提交或分享 `.env` 与包含密钥的数据文件。

## 6. 检查命令

在仓库根目录执行：

```bash
npm test
npm run build
npm run lint --workspace frontend
```

后端已启动后，另开终端执行：

```bash
npm run smoke:v1
```

smoke 检查基本 HTTP 与 WebSocket 流程，不等于交易策略有效性验证。

## 常见问题

| 现象 | 检查方式 |
|---|---|
| 页面 API 请求失败 | 先访问 `/health`；确认后端端口与 `frontend/vite.config.ts` 的代理目标一致 |
| WebSocket 连不上 | 确认 `/ws` 代理、`WS_PATH` 和自定义 `VITE_WS_BASE_URL` 一致 |
| AI 生成失败 | 检查 MiniMax key、model、接口来源与后端日志；先验证手动策略流程 |
| PostgreSQL 未启用 | 检查 `pg` 依赖、连接字符串与迁移；不要把文件回退误认为数据库成功 |
| 第二个 run 无法启动 | 停止现有 active run，再创建新会话 |
| 重启后订单或会话消失 | 当前这些状态存于内存，需后续实现持久化 |

前端测试会生成 `frontend/.tmp-tests/`，这些文件已忽略，不要作为源码提交。API 路径与代码入口见 [开发参考](developer-reference.md)。

返回 [主 README](../README.md) · [文档索引](README.md)。
