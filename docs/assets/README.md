# 方法图与维护

主 README 的三张图直接描述当前代码的工作逻辑：输入、处理顺序、条件分支、计算公式、输出及尚未实现的部分。图中不使用虚构行情、收益数字或应用截图。

| 图 | README 展示资源 | 矢量资源 | 内容 |
|---|---|---|---|
| 1 | [method-strategy.png](method-strategy.png) | [method-strategy.svg](method-strategy.svg) | 手动／AI 配置、人工检查、保存、六因子映射 |
| 2 | [method-backtest.png](method-backtest.png) | [method-backtest.svg](method-backtest.svg) | K 线、加权信号、全样本阈值、持仓、成本与权益 |
| 3 | [method-orders.png](method-orders.png) | [method-orders.svg](method-orders.svg) | 风控失败、市价成交、限价挂单与账户更新 |

## 重绘

可编辑源文件是 [scripts/render-method-figures.py](../../scripts/render-method-figures.py)，使用 Matplotlib 绘图，Pillow 压缩 PNG。它只生成文档资源，不读取行情或运行交易业务，不是应用启动依赖。

在仓库根目录执行：

```bash
python -m pip install matplotlib
python scripts/render-method-figures.py --font /path/to/NotoSansSC.ttf
```

需要支持中文的字体文件，如 Noto Sans SC、Noto Sans CJK SC 或思源黑体；字体未随仓库分发。也可以用 `TRADELAB_FIGURE_FONT` 指定本机字体路径。已安装的上述字体会被自动查找。

脚本生成三组同名 PNG/SVG。PNG 为 160 dpi、宽 2080 像素；SVG 将字形嵌入为路径，读者无需安装绘图字体即可显示。修改文字和布局应编辑 Python 源文件后重绘，而不是直接编辑 SVG 字形路径。SVG 带有 title/desc 和可访问性标签。

## 更新规则

1. 先核对业务代码与 [计算方法](../methodology.md)，确定输入、公式、分支和限制。
2. 更新脚本中的图，再运行重绘。脚本会检查框内文字是否越界。
3. 打开 PNG，人工检查箭头、公式、中文和图注；解析 SVG 确认没有外部图片引用。
4. 同步提交脚本、PNG、SVG、方法说明及 README。算法有变化时，图与文字必须一起更新。

从根目录 README 引用 PNG，可减少不同查看器的 SVG 渲染差异，同时保留 SVG 供放大或导出：

```markdown
![历史回测的信号与收益计算](docs/assets/method-backtest.png)
```

旧概念插图和提示词可在 Git 历史中查看；现行文档使用这三组方法图。
