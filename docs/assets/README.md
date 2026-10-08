# README 插图与维护

主 README 使用三张由内置 imagegen 工具生成的概念插图，取代旧的六组方框式 SVG/PNG。插图解释用途与实验思路，不是应用截图、精确技术图或收益报告；技术关系保留为主 README 中可编辑的 Mermaid 文本。

| 资源 | 用途 | 图中可核对的文字 |
|---|---|---|
| [tradelab-cover.webp](tradelab-cover.webp) | 项目封面 | TradeLab / A place to test trading ideas / PAPER TRADING LAB |
| [experiment-journey.webp](experiment-journey.webp) | 三个实验阶段 | 构建策略 / 历史回测 / 模拟交易 |
| [strategy-building.webp](strategy-building.webp) | 手动与 AI 两条构建路径 | 手动组合 / AI 辅助 / AI 提供建议，由你检查和保存 |

## 设计与导出

统一方向为暖白背景、深蓝主体、少量青绿与珊瑚色，使用有触感的桌面实验工具表达抽象概念。原始生成尺寸为 1672 × 941，展示资源仅转为 WebP 并压缩，保留画面内容和尺寸。

生成方式：内置 imagegen；不在文档中声明工具未暴露的具体模型版本。完整提示词见 [image-prompts.md](image-prompts.md)，便于后续重新生成和迭代。

## 更新一张插图

1. 先修改提示词，明确主题、必须正确的文字和能力边界。
2. 生成后检查文字、构图和技术含义；不要加入虚构回测结果、盈利承诺或尚未实现的自动执行能力。
3. 将选中的图片保存为同名 WebP，检查在浏览器中的清晰度；不需要修改应用代码。
4. 同步更新主 README 的图片描述以及本页资源表。真正的应用截图应另行标注版本与数据来源。

从根目录 README 引用时：

```markdown
![三阶段实验概念](docs/assets/experiment-journey.webp)
```

本目录不再维护旧 SVG。结构图需要修改时，直接编辑主 README 的 Mermaid 块；这样代码关系与审阅文字仍可精确维护。
