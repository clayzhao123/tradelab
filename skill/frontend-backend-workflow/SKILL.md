# Frontend-Backend Workflow Skill

## Purpose

当用户提出任何前端修改建议时，强制执行一轮前后端联动检查，避免“前端看起来改了，但后端接口/数据契约不匹配”。

## Trigger

- 用户提到前端页面、交互、展示、图表、表单、按钮、状态管理、报错体验等改动。
- 关键词示例：`前端`、`UI`、`页面`、`按钮`、`图表`、`watchlist`、`策略`、`delete`、`报错`。

## Mandatory Checklist

1. 先定位前端改动点（组件/页面/context/api client）。
2. 同步核对后端契约（route/schema/service/provider）是否支持该改动。
3. 如果前端诉求依赖后端数据，必须验证真实数据源或可解释降级逻辑（不能默默返回伪造数据）。
4. 若前端动作是写操作（create/update/delete/start/stop），必须验证成功路径和失败路径（尤其 4xx/409）。
5. 修改后至少执行与改动相关的校验命令：
   - `npm run lint --workspace frontend`
   - `npm run test --workspace frontend`
   - 若涉及后端契约或数据流，再跑：
   - `npm run test --workspace backend`
6. 输出结论时必须明确说明：
   - 改了哪些前端文件
   - 改了哪些后端文件（如果有）
   - 当前前后端是否可正常协同工作

## Guard Rails

- 不允许只改前端“假修复”后跳过后端验证。
- 不允许用静态 mock 掩盖真实数据问题，除非用户明确要求。
- 当后端临时不可用时，必须在 UI/日志里可见地提示降级状态。

## Response Template

1. 问题根因（前端/后端各自是什么）
2. 修改清单（前端 + 后端）
3. 验证结果（命令与 PASS/FAIL）
4. 当前风险和下一步建议
