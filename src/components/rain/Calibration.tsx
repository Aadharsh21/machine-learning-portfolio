import { useState } from "react";
import type { Engine, RainMeta } from "@/lib/engine";

const SIZE = 360;
const M = { left: 52, right: 14, top: 14, bottom: 46 };
const W = SIZE - M.left - M.right;
const H = SIZE - M.top - M.bottom;
const TICKS = [0, 0.25, 0.5, 0.75, 1];

const x = (v: number) => M.left + v * W;
const y = (v: number) => M.top + (1 - v) * H;

/** Square reliability chart: each dot groups test days by forecast. */
export function Calibration({ bins, engine }: { bins: RainMeta["calibration"]; engine: Engine }) {
  const [hover, setHover] = useState<number | null>(null);
  const pct = (v: number) => engine.formatPercent(v);
  const tipText = (i: number) => {
    const b = bins[i];
    if (!b) return "";
    return `Forecasts of ${Math.round(b.lo * 100)}–${Math.round(b.hi * 100)}% (${engine.formatInt(
      b.count,
    )} days): rained on ${engine.formatPercent(b.observed, 1)}`;
  };
  const path = bins
    .map((b, i) => `${i ? "L" : "M"}${x(b.mean_predicted).toFixed(1)},${y(b.observed).toFixed(1)}`)
    .join("");
  const hb = hover === null ? undefined : bins[hover];

  return (
    <figure className="m-0">
      <h3 className="font-condensed text-2xl text-ink">Forecasts match reality</h3>
      <div className="relative mt-4 max-w-[26rem]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Calibration chart. For each band of forecasts on the test days, how often it actually rained. The points sit close to the dashed diagonal, so a forecast of 70% means rain on about 70% of those days."
          onMouseLeave={() => setHover(null)}
        >
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
              <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--rule)" strokeWidth={1} />
              <text x={x(0) - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--ink-3)">
                {pct(t)}
              </text>
              <text x={x(t)} y={y(0) + 18} textAnchor="middle" fontSize={12} fill="var(--ink-3)">
                {pct(t)}
              </text>
            </g>
          ))}
          <line
            x1={x(0)}
            y1={y(0)}
            x2={x(1)}
            y2={y(1)}
            stroke="var(--ink-3)"
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />
          <path d={path} fill="none" stroke="var(--rain)" strokeWidth={2} />
          {bins.map((b, i) => (
            <circle
              key={b.lo}
              cx={x(b.mean_predicted)}
              cy={y(b.observed)}
              r={hover === i ? 6 : 4.5}
              fill="var(--rain)"
              stroke="var(--page)"
              strokeWidth={1.5}
            />
          ))}
          {/* generous invisible hit areas for hover and tap */}
          {bins.map((b, i) => (
            <circle
              key={`hit-${b.lo}`}
              cx={x(b.mean_predicted)}
              cy={y(b.observed)}
              r={14}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
          <text
            x={M.left + W / 2}
            y={SIZE - 8}
            textAnchor="middle"
            fontSize={13}
            fill="var(--ink-2)"
          >
            Forecast chance of rain
          </text>
          <text
            transform={`translate(14 ${M.top + H / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={13}
            fill="var(--ink-2)"
          >
            How often it rained
          </text>
        </svg>
        {hb && hover !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 w-max max-w-[15rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm text-ink shadow-sm"
            style={{
              left: `${(x(hb.mean_predicted) / SIZE) * 100}%`,
              top: `${(y(hb.observed) / SIZE) * 100}%`,
              transform: `translate(${hb.mean_predicted > 0.6 ? "-100%" : "0%"}, ${
                hb.observed > 0.5 ? "16px" : "calc(-100% - 12px)"
              })`,
            }}
          >
            {tipText(hover)}
          </div>
        )}
      </div>
      <figcaption className="mt-3 max-w-[26rem] text-sm text-ink-2">
        Each dot groups test days by forecast. The closer to the diagonal, the more the percentages
        can be taken at face value.
      </figcaption>
      <ul className="sr-only">
        {bins.map((_, i) => (
          <li key={i}>{tipText(i)}</li>
        ))}
      </ul>
    </figure>
  );
}
