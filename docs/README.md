# TradeLab 文档导航

先看 [主 README](../README.md) 理解用途和首次运行流程。

## 当前维护入口

| 想了解什么 | 读哪份文档 |
|---|---|
| 启动、环境配置、数据保存与排错 | [本地运行手册](runbook.md) |
| 启动命令、API 路径、WebSocket 和代码入口 | [开发与接口参考](developer-reference.md) |
| 当前结构问题、优先级、能否代为实现 | [结构与维护审查](project-review.md) |
| 前端开发 | [前端 README](../frontend/README.md) |
| 各页面的职责 | [页面语义](page-semantics.md) |
| 领域术语 | [领域词典](domain-glossary.md) |
| WebSocket 消息约定 | [WebSocket 合约](websocket-contract.md) |
| 本轮插图与生成提示词 | [图片维护](assets/README.md) |

## 设计背景与历史记录

以下文档保留当时的设计、计划或检查结论。它们不是当前实现已经全部完成的证明；与现行入口冲突时，需回到当前代码核对。

| 内容 | 文档 |
|---|---|
| 核心策略融合机制 | [2026-04-04 策略融合](strategy-fusion-core-2026-04-04.md) |
| 策略、AI、回测持久化计划 | [2026-04-05 持久化计划](strategy-lab-ai-backtest-persistence-plan-2026-04-05.md) |
| 早期 V1 验收清单 | [V1 验收记录](v1-acceptance.md) |
| 前端可用性审查 | [2026-04-04 前端审查](frontend-usability-audit-2026-04-04.md) |
| 设计变量 | [设计 tokens](design-tokens.md) |
| 吉祥物动画设计 | [2026-04-04 动画说明](robot-mascot-motion-spec-2026-04-04.md) |
| 原始界面设计代码 | [frontend_module 历史设计](../frontend_module/README.md) |
| 开发交接与协作约定 | [memory/](../memory/) · [skill/](../skill/README.md) |

文档维护方式：主 README 讲用途和使用；runbook 讲配置与排错；developer-reference 讲代码与接口；project-review 记录待办。新增设计计划应带日期，避免再次形成多个“当前说明”。
