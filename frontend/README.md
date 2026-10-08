# TradeLab 前端

这是 TradeLab 当前使用的 React 前端，提供行情面板、策略构建、历史回测、模拟订单和运行会话页面。项目目的与功能边界见 [主 README](../README.md)。

## 启动

使用满足 Vite 8 要求的 Node.js，例如 Node 22.12+ 或受支持的更高版本。在**仓库根目录**执行：

```bash
npm ci
npm run dev
```

`npm run dev` 同时启动前端和后端。默认前端地址为 http://localhost:5173，后端为 http://localhost:3001。复制 `.env.example`、选择 mock 行情的步骤见 [本地运行手册](../docs/runbook.md)。

如果只启动前端，在根目录运行 `npm run dev --workspace frontend`；行情、回测、订单和 AI 功能仍需要后端。

## API 与 WebSocket 连接

开发时 `frontend/.env` 的 `VITE_API_BASE_URL` 和 `VITE_WS_BASE_URL` 可以留空。`vite.config.ts` 将 `/api` 代理到 `http://127.0.0.1:3001`，将 `/ws` 代理到 `ws://127.0.0.1:3001`。

若后端端口变化，需修改代理目标；连接外部后端时可以设置上述环境变量并重启 Vite。变量示例见 [.env.example](.env.example)。Vite 的开发代理不适用于静态文件部署，部署时需配置后端地址或反向代理。

## 从哪里开始读代码

| 位置 | 用途 |
|---|---|
| `src/app/routes.tsx` | 页面路由与按需加载入口 |
| `src/app/` | 页面、组件、状态和业务交互 |
| `src/app/constants/indicatorCatalog.ts` | 策略实验室的指标目录 |
| `vite.config.ts` | React/Tailwind 插件、代理和路径别名 |
| `package.json` | 前端依赖与检查命令 |

实际依赖为 React 19、TypeScript 5.9、Vite 8、Tailwind CSS 4、React Router 和 Recharts。仓库中的 `frontend_module/` 是原始设计参考代码，不是这个 workspace，也不是当前启动入口。

## 检查与构建

在仓库根目录执行：

```bash
npm run test --workspace frontend
npm run lint --workspace frontend
npm run build --workspace frontend
```

`npm run preview --workspace frontend` 用于预览已构建的前端，仍需正确配置 API/WS 地址或反向代理。完整前后端检查见 [主 README](../README.md#修改与检查)。
