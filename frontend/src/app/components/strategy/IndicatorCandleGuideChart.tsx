import { type GuideVisualMode } from "../../constants/indicatorGuides";

type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
};

type IndicatorCandleGuideChartProps = {
  mode: GuideVisualMode;
};

const CANDLES: Candle[] = [
  { open: 102, high: 105, low: 101, close: 104 },
  { open: 104, high: 106, low: 103, close: 103.4 },
  { open: 103.4, high: 104.1, low: 101.8, close: 102.2 },
  { open: 102.2, high: 103, low: 100.4, close: 101 },
  { open: 101, high: 102, low: 99.4, close: 99.8 },
  { open: 99.8, high: 101.3, low: 99.1, close: 100.9 },
  { open: 100.9, high: 103.2, low: 100.3, close: 102.8 },
  { open: 102.8, high: 104.4, low: 101.9, close: 103.1 },
  { open: 103.1, high: 103.9, low: 102.1, close: 102.5 },
  { open: 102.5, high: 104.8, low: 101.6, close: 104.2 },
  { open: 104.2, high: 107.1, low: 103.7, close: 106.3 },
  { open: 106.3, high: 107.4, low: 105.1, close: 105.5 },
  { open: 105.5, high: 106.2, low: 103.8, close: 104.4 },
  { open: 104.4, high: 105, low: 102.6, close: 103 },
  { open: 103, high: 103.5, low: 100.9, close: 101.8 },
  { open: 101.8, high: 102.6, low: 100.1, close: 101.1 },
  { open: 101.1, high: 101.8, low: 99.2, close: 99.6 },
  { open: 99.6, high: 101.2, low: 98.9, close: 100.7 },
  { open: 100.7, high: 102.4, low: 100.2, close: 101.9 },
  { open: 101.9, high: 103.6, low: 101.1, close: 102.7 },
];

const PRICE_TOP = 16;
const PRICE_BOTTOM = 138;
const WIDTH = 760;
const HEIGHT = 250;
const PADDING_X = 18;
const CANDLE_GAP = 4;

function toFixedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
}

function movingAverage(values: number[], period: number): number[] {
  const output: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - period + 1);
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    output.push(avg);
  }
  return output;
}

function scale(value: number, min: number, max: number): number {
  if (Math.abs(max - min) < 1e-6) {
    return (PRICE_TOP + PRICE_BOTTOM) / 2;
  }
  const ratio = (value - min) / (max - min);
  return PRICE_BOTTOM - ratio * (PRICE_BOTTOM - PRICE_TOP);
}

export function IndicatorCandleGuideChart({ mode }: IndicatorCandleGuideChartProps) {
  const candleWidth = (WIDTH - PADDING_X * 2 - CANDLE_GAP * (CANDLES.length - 1)) / CANDLES.length;
  const lows = CANDLES.map((row) => row.low);
  const highs = CANDLES.map((row) => row.high);
  const closes = CANDLES.map((row) => row.close);
  const minPrice = Math.min(...lows) - 0.4;
  const maxPrice = Math.max(...highs) + 0.4;

  const points = CANDLES.map((row, index) => {
    const x = PADDING_X + index * (candleWidth + CANDLE_GAP) + candleWidth / 2;
    return { x, y: scale(row.close, minPrice, maxPrice) };
  });
  const ma = movingAverage(closes, 5).map((value, index) => ({ x: points[index].x, y: scale(value, minPrice, maxPrice) }));
  const upperBand = movingAverage(closes, 5).map((value, index) => ({ x: points[index].x, y: scale(value + 1.25, minPrice, maxPrice) }));
  const lowerBand = movingAverage(closes, 5).map((value, index) => ({ x: points[index].x, y: scale(value - 1.25, minPrice, maxPrice) }));
  const areaPath = `${toFixedPath(ma)} L${ma[ma.length - 1].x.toFixed(2)},${PRICE_BOTTOM} L${ma[0].x.toFixed(2)},${PRICE_BOTTOM} Z`;

  const oscillatorPoints = closes.map((close, index) => {
    const value = 50 + (close - movingAverage(closes, 4)[index]) * 14;
    const clamped = Math.max(5, Math.min(95, value));
    const y = 230 - (clamped / 100) * 56;
    return { x: points[index].x, y };
  });

  const volumeBars = closes.map((close, index) => {
    const base = 8 + Math.abs(close - (closes[index - 1] ?? close)) * 20;
    return Math.max(8, Math.min(48, base));
  });

  const derivativeBars = closes.map((close, index) => {
    const drift = close - (closes[Math.max(0, index - 1)] ?? close);
    return Math.max(-24, Math.min(24, drift * 11));
  });

  const riskCurve = closes.map((_, index) => {
    const base = 20 + index * 2.2;
    const pullback = index > 12 ? (index - 12) * 2.9 : 0;
    return Math.max(10, 76 - (base - pullback));
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg border border-border-subtle bg-[#efeee9]">
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#efeee9" />
      <line x1={12} y1={PRICE_BOTTOM} x2={WIDTH - 12} y2={PRICE_BOTTOM} stroke="rgba(60,58,52,0.14)" strokeWidth="1" />
      <line x1={12} y1={PRICE_TOP} x2={WIDTH - 12} y2={PRICE_TOP} stroke="rgba(60,58,52,0.08)" strokeWidth="1" />

      {mode === "band" && (
        <>
          <path d={toFixedPath(upperBand)} fill="none" stroke="rgba(91,79,191,0.7)" strokeWidth="1.6" strokeDasharray="4 3" />
          <path d={toFixedPath(lowerBand)} fill="none" stroke="rgba(91,79,191,0.7)" strokeWidth="1.6" strokeDasharray="4 3" />
          <path
            d={`${toFixedPath(upperBand)} L${lowerBand[lowerBand.length - 1].x.toFixed(2)},${lowerBand[lowerBand.length - 1].y.toFixed(2)} ${[...lowerBand]
              .reverse()
              .map((point) => `L${point.x.toFixed(2)},${point.y.toFixed(2)}`)
              .join(" ")} Z`}
            fill="rgba(91,79,191,0.08)"
          />
        </>
      )}

      {(mode === "trend" || mode === "risk" || mode === "derivatives" || mode === "volume" || mode === "oscillator") && (
        <>
          <path d={areaPath} fill="rgba(91,79,191,0.16)" />
          <path d={toFixedPath(ma)} fill="none" stroke="#5b4fbf" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}

      {mode === "structure" && (
        <>
          <rect x="110" y="53" width="220" height="22" fill="rgba(26,122,82,0.08)" stroke="rgba(26,122,82,0.35)" />
          <rect x="430" y="88" width="220" height="22" fill="rgba(192,57,43,0.08)" stroke="rgba(192,57,43,0.35)" />
          <path d={toFixedPath(ma)} fill="none" stroke="#5b4fbf" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}

      {CANDLES.map((row, index) => {
        const x = PADDING_X + index * (candleWidth + CANDLE_GAP);
        const bodyTop = scale(Math.max(row.open, row.close), minPrice, maxPrice);
        const bodyBottom = scale(Math.min(row.open, row.close), minPrice, maxPrice);
        const wickTop = scale(row.high, minPrice, maxPrice);
        const wickBottom = scale(row.low, minPrice, maxPrice);
        const isUp = row.close >= row.open;
        return (
          <g key={`candle-${index}`}>
            <line
              x1={x + candleWidth / 2}
              y1={wickTop}
              x2={x + candleWidth / 2}
              y2={wickBottom}
              stroke={isUp ? "rgba(26,122,82,0.55)" : "rgba(192,57,43,0.55)"}
              strokeWidth="1.3"
            />
            <rect
              x={x}
              y={bodyTop}
              width={candleWidth}
              height={Math.max(2.4, bodyBottom - bodyTop)}
              rx="1.5"
              fill={isUp ? "rgba(26,122,82,0.35)" : "rgba(192,57,43,0.34)"}
              stroke={isUp ? "rgba(26,122,82,0.58)" : "rgba(192,57,43,0.58)"}
            />
          </g>
        );
      })}

      {mode === "volume" && (
        <g>
          <rect x="0" y="170" width={WIDTH} height="80" fill="rgba(255,255,255,0.52)" />
          {volumeBars.map((barHeight, index) => {
            const x = PADDING_X + index * (candleWidth + CANDLE_GAP);
            return (
              <rect
                key={`vol-${index}`}
                x={x}
                y={226 - barHeight}
                width={candleWidth}
                height={barHeight}
                fill="rgba(91,79,191,0.4)"
                rx="1.4"
              />
            );
          })}
        </g>
      )}

      {mode === "oscillator" && (
        <g>
          <rect x="0" y="170" width={WIDTH} height="80" fill="rgba(255,255,255,0.52)" />
          <line x1={12} y1={182} x2={WIDTH - 12} y2={182} stroke="rgba(60,58,52,0.2)" strokeDasharray="4 4" />
          <line x1={12} y1={221} x2={WIDTH - 12} y2={221} stroke="rgba(60,58,52,0.2)" strokeDasharray="4 4" />
          <path d={toFixedPath(oscillatorPoints)} fill="none" stroke="#5b4fbf" strokeWidth="2.4" />
        </g>
      )}

      {mode === "risk" && (
        <g>
          <rect x="0" y="170" width={WIDTH} height="80" fill="rgba(255,255,255,0.52)" />
          <path
            d={riskCurve
              .map((value, index) => {
                const x = PADDING_X + index * (candleWidth + CANDLE_GAP) + candleWidth / 2;
                const y = 170 + value;
                return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(192,57,43,0.85)"
            strokeWidth="2.2"
          />
        </g>
      )}

      {mode === "derivatives" && (
        <g>
          <rect x="0" y="170" width={WIDTH} height="80" fill="rgba(255,255,255,0.52)" />
          <line x1={12} y1={208} x2={WIDTH - 12} y2={208} stroke="rgba(60,58,52,0.2)" />
          {derivativeBars.map((bar, index) => {
            const x = PADDING_X + index * (candleWidth + CANDLE_GAP);
            const y = bar >= 0 ? 208 - bar : 208;
            return (
              <rect
                key={`derivative-${index}`}
                x={x}
                y={y}
                width={candleWidth}
                height={Math.max(2, Math.abs(bar))}
                fill={bar >= 0 ? "rgba(26,122,82,0.42)" : "rgba(192,57,43,0.42)"}
                rx="1.2"
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}
