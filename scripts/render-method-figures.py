#!/usr/bin/env python3
"""Render the current TradeLab method diagrams. No market data is queried.

Requires matplotlib and a CJK font (e.g. Noto Sans SC).
Usage: python scripts/render-method-figures.py --font /path/to/NotoSansSC.ttf
"""
from __future__ import annotations

import argparse
import os
from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
from matplotlib import font_manager
from matplotlib.patches import FancyArrowPatch, Rectangle

ROOT = Path(__file__).resolve().parents[1]
INK = "#263442"
MUTED = "#586574"
BLUE = "#315f83"
PALE = "#f4f7fa"
GRAY = "#f6f6f6"
REVIEW = "#876138"
FONT = None
BOUNDS = []


def canvas(height, title, subtitle):
    global BOUNDS
    BOUNDS = []
    fig, ax = plt.subplots(figsize=(13, height))
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
    ax.set(xlim=(0, 13), ylim=(0, height))
    ax.axis("off")
    label(ax, .4, height-.44, title, 21, color=INK)
    label(ax, .4, height-.85, subtitle, 12.5, color=MUTED)
    ax.plot([.4, 12.6], [height-1.05]*2, color="#c8d0d8", lw=.8)
    return fig, ax


def label(ax, x, y, text, size=12, color=MUTED, align="left", bbox=None):
    item = ax.text(x, y, text, fontsize=size, fontproperties=FONT,
                   color=color, ha=align, va="center", linespacing=1.08,
                   bbox=bbox)
    return item


def box(ax, x, y, w, h, title, lines=(), accent=BLUE, fill=PALE, size=13):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fill,
                           edgecolor="#72808d", linewidth=.85))
    ax.plot([x, x+w], [y+h, y+h], color=accent, linewidth=2)
    if not lines:
        text = label(ax, x+w/2, y+h/2, title, 14, accent, "center")
        BOUNDS.append((text, (x+.08, y+.05, w-.16, h-.1), title))
        return
    heading = label(ax, x+w/2, y+h-.25, title, 14.5, accent, "center")
    BOUNDS.append((heading, (x+.08, y+.05, w-.16, h-.1), title))
    text = label(ax, x+w/2, y+(h-.43)/2, "\n".join(lines), size, INK, "center")
    BOUNDS.append((text, (x+.08, y+.05, w-.16, h-.1), title+" body"))


def arrow(ax, points, color=INK, dashed=False):
    for a, b in zip(points[:-2], points[1:-1]):
        ax.plot([a[0], b[0]], [a[1], b[1]], color=color,
                linewidth=1.05, linestyle="--" if dashed else "-")
    ax.add_patch(FancyArrowPatch(points[-2], points[-1],
                arrowstyle="-|>", mutation_scale=11, linewidth=1.05,
                color=color, linestyle="--" if dashed else "-",
                shrinkA=0, shrinkB=1))


def save(fig, ax, name, title, description, out):
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    for text, bounds, note in BOUNDS:
        bbox = text.get_window_extent(renderer).transformed(ax.transData.inverted())
        x, y, w, h = bounds
        tolerance = .025
        assert bbox.x0 >= x-tolerance and bbox.x1 <= x+w+tolerance, (name, note, "width", bbox.bounds)
        assert bbox.y0 >= y-tolerance and bbox.y1 <= y+h+tolerance, (name, note, "height", bbox.bounds)
    raw = BytesIO()
    fig.savefig(raw, format="png", dpi=160, facecolor="white")
    raw.seek(0)
    with Image.open(raw) as image:
        image.convert("RGB").quantize(colors=128).save(out/f"{name}.png", optimize=True)
    # Embed glyph outlines so SVG readers do not need the author's font.
    with matplotlib.rc_context({"svg.fonttype": "path", "svg.hashsalt": "tradelab-methods"}):
        fig.savefig(out/f"{name}.svg", facecolor="white", metadata={"Title": title, "Description": description, "Date": None})
    ns = "http://www.w3.org/2000/svg"
    ET.register_namespace("", ns)
    tree = ET.parse(out/f"{name}.svg")
    root = tree.getroot()
    root.set("role", "img")
    root.set("aria-labelledby", "figure-title figure-description")
    title_node = ET.Element(f"{{{ns}}}title", {"id": "figure-title"})
    title_node.text = title
    desc = ET.Element(f"{{{ns}}}desc", {"id": "figure-description"})
    desc.text = description
    # Matplotlib may already include a title; retain exactly one title/desc.
    for child in list(root):
        if child.tag in (f"{{{ns}}}title", f"{{{ns}}}desc"):
            root.remove(child)
    root.insert(0, title_node)
    root.insert(1, desc)
    tree.write(out/f"{name}.svg", encoding="UTF-8", xml_declaration=True)
    svg_path = out/f"{name}.svg"
    svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text().splitlines()) + "\n")
    plt.close(fig)


def strategy(out):
    fig, ax = canvas(7.5, "图 1  策略构建与因子映射", "配置层决定指标与权重；回测层将配置转换为六因子模型。")
    label(ax, .4, 6.07, "(a) 策略配置：手动路径与可选 AI 路径", 13.5, BLUE)
    box(ax, .4, 4.2, 2.2, 1.4, "指标目录", ["名称／类别／标签", "候选指标池／已选指标"])
    box(ax, 3.1, 5.02, 2.4, .85, "手动组合", ["用户选择并编辑权重"], size=12.7)
    box(ax, 3.1, 3.68, 2.4, 1.05, "MiniMax 建议", ["描述或已选指标", "需配置 model 与 key"], size=12.7)
    box(ax, .4, 3.0, 2.2, .8, "自然语言描述", ["AI prompt 模式"], size=12.5)
    box(ax, 6.1, 4.18, 2.5, 1.42, "人工检查与草稿", ["过滤未知指标", "权重归一化至 100%"], size=12.7)
    box(ax, 9.3, 4.18, 3.3, 1.42, "保存策略配置", ["params.fusion.indicators", "名称／标签／权重"], size=12.5)
    arrow(ax, [(2.6, 5.16), (2.82, 5.16), (2.82, 5.45), (3.1, 5.45)])
    arrow(ax, [(2.6, 4.6), (2.82, 4.6), (2.82, 4.3), (3.1, 4.3)])
    arrow(ax, [(2.6, 3.4), (2.87, 3.4), (2.87, 3.96), (3.1, 3.96)])
    arrow(ax, [(5.5, 5.45), (5.78, 5.45), (5.78, 5.14), (6.1, 5.14)])
    arrow(ax, [(5.5, 4.2), (5.8, 4.2), (5.8, 4.63), (6.1, 4.63)])
    arrow(ax, [(8.6, 4.9), (9.3, 4.9)])
    label(ax, .4, 2.52, "(b) 回测配置：类别映射，而非逐项执行指标原公式", 13.5, BLUE)
    box(ax, .4, .87, 3.15, 1.25, "类别／标签 → 因子", ["多重命中：平均分摊权重", "未命中：归入趋势因子"], size=12.3)
    box(ax, 4.12, .87, 3.1, 1.25, "补齐与归一化", ["未出现因子补默认权重", "六因子权重之和为 1"], size=12.7)
    box(ax, 7.88, .87, 4.72, 1.25, "六因子权重 w", ["趋势／动量／均值回归", "波动率／成交量／市场结构"], size=12.5)
    arrow(ax, [(10.95, 4.18), (10.95, 2.9), (.18, 2.9), (.18, 1.49), (.4, 1.49)])
    arrow(ax, [(3.55, 1.49), (4.12, 1.49)])
    arrow(ax, [(7.22, 1.49), (7.88, 1.49)])
    label(ax, .4, .35, "边界：AI 提供配置建议与评分，不计算已验证收益；实际历史信号由图 2 的六因子模型产生。", 11.8)
    save(fig, ax, "method-strategy", "策略构建与因子映射", "手动或 MiniMax 建议经人工检查与权重归一化保存为策略；回测按标签映射、分摊、默认补齐和归一化形成六因子权重。", out)


def backtest(out):
    fig, ax = canvas(9.3, "图 2  历史回测的信号与收益计算", "逐币种构建历史信号，再计算持仓、成本、权益和组合统计。")
    label(ax, .4, 7.96, "计算流程（实线箭头）", 13.5, BLUE)
    label(ax, 4.48, 7.96, "对应数据与数学定义（点线说明）", 13.5, BLUE)
    rows = [(6.5, 1.12), (4.92, 1.3), (3.1, 1.52), (1.1, 1.68)]
    box(ax, .4, *[rows[0][0], 3.45, rows[0][1]], "01 数据与因子信号", ["OHLCV 按时间排序", "预热 30 根；至少 40 根输入"], size=12.4)
    box(ax, 4.48, 6.5, 8.12, 1.12, "输入与六因子", ["历史 K 线／策略权重／币种／周期／回看长度／初始资金", "趋势、动量、均值回归、波动率、成交量、市场结构"], size=12.6)
    box(ax, .4, 4.92, 3.45, 1.3, "02 加权合成", ["各因子得分按权重组合", "形成每个时点的信号 S"], size=12.5)
    box(ax, 4.48, 4.92, 8.12, 1.3, "组合信号", ["$S_{s,t}=\\sum_{j=1}^{6} w_j F_{j,s,t}$", "s：币种；t：K 线时点；w：归一化因子权重"], size=13.1)
    box(ax, .4, 3.1, 3.45, 1.52, "03 阈值与持仓", ["整个样本估算对称阈值", "目标持仓：多／空／空仓"], size=12.5)
    box(ax, 4.48, 3.1, 8.12, 1.52, "当前阈值方法（使用全币种、全时间样本）", ["$\\theta=\\mathrm{round}_4[\\mathrm{clip}(Q_q(\\{|S_{s,t}|\\}_{s,t}),0.02,0.95)]$", "$p_t=+1$ 若 $S_t\\geq\\theta$；$p_t=-1$ 若 $S_t\\leq-\\theta$；否则 $p_t=0$", "q = 0.58／0.70／0.82：激进／中性／保守"], size=12.6)
    box(ax, .4, 1.1, 3.45, 1.68, "04 收益、权益与输出", ["以前一根持仓计本根收益", "持仓切换扣固定成本", "生成单币及组合结果"], size=12.4)
    box(ax, 4.48, 1.1, 8.12, 1.68, "当前收益更新与权益下限", ["$r_t=p_{t-1}(C_t/C_{t-1}-1)-0.00055\\,|p_t-p_{t-1}|$", "$E_t=\\max(E_{t-1}(1+r_t),\\ 0.2E_0)$", "C：收盘价；E：权益；初始持仓 p = 0"], size=13)
    for upper, lower in zip(rows, rows[1:]):
        arrow(ax, [(2.125, upper[0]), (2.125, lower[0]+lower[1])])
    for y, h in rows:
        ax.plot([3.85, 4.48], [y+h/2]*2, color=MUTED, lw=.9, linestyle=":")
    label(ax, .4, .66, "输出：权益、回撤、Sharpe、持仓 K 线胜率与切换次数；保存参数快照及回测历史。", 11.9)
    label(ax, .4, .3, "方法边界：全样本阈值包含未来信息；权益设 20% 下限；组合尾部截齐后按索引取均值，尚非严格时间对齐。", 11.6, REVIEW)
    save(fig, ax, "method-backtest", "历史回测的信号与收益计算", "OHLCV 经六因子计算与加权信号后，用整个样本分位数得到阈值；前一时点持仓计算收益，切换扣 0.00055 成本，权益设初始值 20% 下限，并输出统计及历史。", out)


def orders(out):
    fig, ax = canvas(8.8, "图 3  模拟订单的分支与账户更新", "请求驱动的模拟账本；市价与限价路径不同，当前没有策略自动下单循环。")
    label(ax, .4, 7.4, "可选会话：strategyId + initialCash → start／stop；只管理会话、资金与 runId 关联。", 12.3)
    box(ax, .4, 5.97, 3.45, 1.03, "手动订单请求", ["币种／方向／类型／数量", "可关联运行会话"], size=12.2)
    box(ax, 4.65, 5.97, 3.55, 1.03, "行情参考价", ["市价：Quote.last", "限价：用户 limitPrice"], size=12.5)
    box(ax, 8.95, 5.97, 3.65, 1.03, "账户与风险参数", ["现金／持仓／敞口／回撤", "风险规则可开关"], size=12.4)
    box(ax, 4.65, 4.48, 3.55, 1.03, "价格可用性与风控", ["限额／敞口／现金／回撤", "不通过则拒绝请求"], size=12.5)
    arrow(ax, [(2.12, 5.97), (2.12, 5.75), (5.15, 5.75), (5.15, 5.51)])
    arrow(ax, [(6.43, 5.97), (6.43, 5.51)])
    arrow(ax, [(10.78, 5.97), (10.78, 5.75), (7.69, 5.75), (7.69, 5.51)])
    box(ax, .4, 4.48, 3.45, 1.03, "失败分支", ["返回错误；风险失败记事件", "此时尚未创建订单"], accent=REVIEW, fill=GRAY, size=12.2)
    arrow(ax, [(4.65, 5.0), (3.85, 5.0)], color=REVIEW)
    box(ax, 4.65, 3.28, 3.55, .73, "通过：创建模拟订单")
    arrow(ax, [(6.43, 4.48), (6.43, 4.01)])
    box(ax, .4, 1.96, 5.6, 1.03, "市价订单 MARKET", ["按 Quote.last 立即全量成交，status = filled", "fee = 数量 × 成交价 × 0.0006"], size=12.4)
    box(ax, 7, 1.96, 5.6, 1.03, "限价订单 LIMIT", ["status = open；fill = null", "仅挂单，当前没有自动撮合"], size=12.7)
    arrow(ax, [(6.43, 3.28), (6.43, 3.12), (3.2, 3.12), (3.2, 2.99)])
    arrow(ax, [(6.43, 3.28), (6.43, 3.12), (9.8, 3.12), (9.8, 2.99)])
    box(ax, .4, .47, 5.6, 1.12, "成交后的事务与事件", ["写成交、更新订单、持仓、成本与现金", "order.updated／fill.created／account.updated"], size=12.3)
    box(ax, 7, .47, 5.6, 1.12, "用户取消挂单", ["status = cancelled；发布 order.updated", "不产生模拟成交"], size=12.6)
    arrow(ax, [(3.2, 1.96), (3.2, 1.59)])
    arrow(ax, [(9.8, 1.96), (9.8, 1.59)])
    label(ax, .4, .17, "存储边界：上述订单、成交、账户和会话存于 MemoryDb；事件通知界面，后端重启后不保证保留。", 11.6)
    save(fig, ax, "method-orders", "模拟订单的分支与账户更新", "手动请求先读取行情、账户和风险规则；失败时尚未建单。市价单立即全量模拟成交并按 0.0006 收费，限价单只挂单及可取消。账本在内存，运行会话不自动生成策略订单。", out)


def main():
    global FONT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", default=os.environ.get("TRADELAB_FIGURE_FONT"))
    parser.add_argument("--out", type=Path, default=ROOT/"docs"/"assets")
    args = parser.parse_args()
    font_path = args.font
    if not font_path:
        for entry in font_manager.fontManager.ttflist:
            if entry.name in ("Noto Sans SC", "Noto Sans CJK SC", "Source Han Sans SC"):
                font_path = entry.fname
                break
    if not font_path or not Path(font_path).is_file():
        parser.error("Install a CJK font or supply --font /path/to/NotoSansSC.ttf")
    FONT = font_manager.FontProperties(fname=font_path)
    args.out.mkdir(parents=True, exist_ok=True)
    for render in (strategy, backtest, orders):
        render(args.out)
    print("Rendered 3 method figures as PNG and font-independent SVG.")


if __name__ == "__main__":
    main()
