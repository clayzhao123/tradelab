# README 图示维护

这里保存主 README 的六张说明图。PNG 用于展示，SVG 是可编辑源文件。它们描述当前工作流程和系统结构，不是应用截图、实时数据或收益证明。

| 文件名（同名 `.svg` / `.png`） | 内容 |
|---|---|
| `strategy-fusion` | 手动策略与可选 AI 建议 |
| `backtest-flow` | 回测输入、引擎和结果 |
| `market-data` | 真实/模拟行情与回退 |
| `paper-orders` | 风险检查、模拟成交和账户 |
| `run-session` | 运行会话开始与停止 |
| `architecture` | 前后端与存储边界 |

## 在 GitHub README 中显示

将 SVG 放入代码块，GitHub 会显示代码而不会将其当作图片。主 README 使用普通图片链接：

```markdown
![策略构建流程](docs/assets/strategy-fusion.png)

[查看 SVG 源图](docs/assets/strategy-fusion.svg)
```

上面的相对路径以根目录 README 为起点；从其他目录引用时需调整路径。PNG 不需要阅读器支持嵌入 SVG。

## 修改一张图

1. 用 Inkscape 等矢量编辑器打开对应 SVG，或编辑其 XML。保持 `title` / `desc` 描述准确；XML 文本中的 `&` 必须写成 `&amp;`。
2. 在仓库根目录重新导出同名 PNG，例如：

```bash
inkscape docs/assets/strategy-fusion.svg --export-type=png --export-filename=docs/assets/strategy-fusion.png --export-width=1440
```

3. 检查文字、箭头、裁切与 PNG 清晰度。源图使用 DejaVu Sans，回退字体为 Arial / sans-serif；更换字体后要重新检查排版。
4. 同时提交 SVG 与 PNG。修改功能含义时，也更新主 README 中的文字和图片替代描述。

Inkscape 仅用于维护这些文档图片，运行 TradeLab 不需要安装它。图中不应加入未经实际验证的收益、胜率或能力承诺。
