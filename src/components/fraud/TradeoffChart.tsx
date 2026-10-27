import { useMemo, useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { kUsd, niceTicks } from "@/lib/axis";
import type { Engine, FraudLab, FraudPolicy, TradeoffPoint } from "@/lib/engine";

const Z = 9.21;
const M = { left: 60, right: 16, top: 52, bottom: 46 };
const TICKS = [0.0001, 0.001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.999];
const NARROW_TICKS = [0.0001, 0.01, 0.5, 0.99];
const logit = (p: number) => Math.log(p / (1 - p));
const tickLabel = (p: number) => `${+(p * 100).toPrecision(3)}%`;

interface Props {
  lab: FraudLab;
  engine: Engine;
  policy: FraudPolicy;
  /** alert above this probability (switches the rule to the threshold rule) */
  onThreshold: (t: number) => void;
}

/** Net savings at every alert cut-off, for the current model and review cost. */
export function TradeoffChart({ lab, engine, policy, onThreshold }: Props) {
  const [wrap, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<TradeoffPoint | null>(null);
  const t = useMemo(
    () => lab.tradeoff(policy.model, policy.reviewCost),
    [lab, policy.model, policy.reviewCost],
  );
  const elr = useMemo(() => lab.evaluate({ ...policy, rule: "expected_loss" }).net, [lab, policy]);

  const narrow = width < 520;
  const h = narrow ? 300 : 340;
  const pw = Math.max(1, width - M.left - M.right);
  const ph = h - M.top - M.bottom;
  // lenient cut-offs fall far below zero; the floor is a loss of 1.25 x all the fraud in the window
  const top = Math.max(t.best.net, elr, 1000) * 1.15;
  const floor = -lab.meta.test_fraud_amount * 1.25;
  const x = (p: number) => M.left + ((Math.max(-Z, Math.min(Z, logit(p))) + Z) / (2 * Z)) * pw;
  const y = (v: number) => M.top + ((top - v) / (top - floor)) * ph;
  const path = t.points
    .map((p, i) => `${i ? "L" : "M"}${x(p.threshold).toFixed(1)},${y(p.net).toFixed(1)}`)
    .join("");
  const best = t.best;
  const bx = x(best.threshold);
  const by = y(best.net);
  const bestText = `Best: alert above ${engine.formatChance(best.threshold)} → ${engine.formatSignedUsd(
    best.net,
  )} with ${engine.formatInt(best.alerts)} alerts`;
  const nearest = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    let found: TradeoffPoint | null = null;
    let d = Infinity;
    for (const p of t.points) {
      const dd = Math.abs(x(p.threshold) - px);
      if (dd < d) {
        d = dd;
        found = p;
      }
    }
    return d < 24 ? found : null;
  };
  const use = (p: number) => onThreshold(Number(p.toPrecision(4)));

  return (
    <figure className="m-0 min-w-0">
      <h3 className="font-condensed text-2xl text-ink">Net savings at each cut-off</h3>
      <div ref={wrap} className="relative mt-3">
        {width > 0 && (
          <svg
            width={width}
            height={h}
            className="block"
            role="img"
            aria-label={`Net savings against the alert cut-off for ${policy.model} at ${engine.formatUsd(
              policy.reviewCost,
            )} per review. ${bestText}. The expected-loss rule nets ${engine.formatSignedUsd(elr)}.`}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <clipPath id="tradeoff-plot">
                <rect x={M.left} y={M.top} width={pw} height={ph} />
              </clipPath>
            </defs>
            {niceTicks(floor, top, 6).map((v) => (
              <g key={v}>
                <line
                  x1={M.left}
                  x2={M.left + pw}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={v === 0 ? "var(--ink-3)" : "var(--rule)"}
                />
                <text
                  x={M.left - 8}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--ink-3)"
                >
                  {kUsd(v)}
                </text>
              </g>
            ))}
            {(narrow ? NARROW_TICKS : TICKS).map((p) => (
              <g key={p}>
                <line
                  x1={x(p)}
                  x2={x(p)}
                  y1={M.top}
                  y2={M.top + ph}
                  stroke="var(--rule)"
                  strokeDasharray="2 3"
                />
                <text
                  x={x(p)}
                  y={M.top + ph + 18}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--ink-3)"
                >
                  {tickLabel(p)}
                </text>
              </g>
            ))}
            <text
              x={M.left + pw / 2}
              y={h - 6}
              textAnchor="middle"
              fontSize={12}
              fill="var(--ink-2)"
            >
              Alert above this chance of fraud (log-odds scale)
            </text>
            <text
              transform={`translate(14 ${M.top + ph / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={12}
              fill="var(--ink-2)"
            >
              Net savings
            </text>

            {/* the expected-loss rule, for reference */}
            <line
              x1={M.left}
              x2={M.left + pw}
              y1={y(elr)}
              y2={y(elr)}
              stroke="var(--series-4)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text
              x={M.left + 6}
              y={y(elr) - 6}
              fontSize={12}
              fill="var(--ink-2)"
              stroke="var(--page)"
              strokeWidth={3}
              paintOrder="stroke"
            >
              Expected-loss rule: {engine.formatSignedUsd(elr)}
            </text>

            <path
              d={path}
              fill="none"
              stroke="var(--fraud)"
              strokeWidth={2}
              clipPath="url(#tradeoff-plot)"
            />
            {policy.rule === "threshold" && (
              <line
                x1={x(policy.threshold ?? 0.5)}
                x2={x(policy.threshold ?? 0.5)}
                y1={M.top}
                y2={M.top + ph}
                stroke="var(--ink)"
                strokeWidth={1.5}
              />
            )}
            <line x1={bx} x2={bx} y1={M.top - 8} y2={by - 6} stroke="var(--ink-3)" />
            <circle
              cx={bx}
              cy={by}
              r={5}
              fill="var(--fraud)"
              stroke="var(--page)"
              strokeWidth={2}
            />
            {hover && (
              <circle
                cx={x(hover.threshold)}
                cy={Math.max(M.top, Math.min(M.top + ph, y(hover.net)))}
                r={4}
                fill="var(--page)"
                stroke="var(--ink)"
                strokeWidth={2}
              />
            )}
            <rect
              x={M.left}
              y={M.top}
              width={pw}
              height={ph}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseMove={(e) =>
                setHover(
                  nearest(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect()),
                )
              }
              onClick={(e) => {
                const p = nearest(
                  e.clientX,
                  e.currentTarget.ownerSVGElement!.getBoundingClientRect(),
                );
                if (p) use(p.threshold);
              }}
            />
          </svg>
        )}
        {width > 0 && (
          <p
            className="pointer-events-none absolute top-0 text-xs leading-snug font-semibold text-ink"
            style={{
              // centred over the best point, kept inside the chart
              left: Math.min(
                Math.max(bx, Math.min(170, (width - 16) / 2) + 4),
                width - Math.min(170, (width - 16) / 2) - 4,
              ),
              transform: "translateX(-50%)",
              width: "max-content",
              maxWidth: Math.min(340, width - 16),
              textAlign: "center",
            }}
          >
            {bestText}
          </p>
        )}
        {hover && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 w-max rounded-md border border-rule-strong bg-page px-3 py-2 text-sm shadow-sm"
            style={{
              left: x(hover.threshold),
              top: M.top + 8,
              transform: `translateX(${x(hover.threshold) > M.left + pw / 2 ? "calc(-100% - 10px)" : "10px"})`,
            }}
          >
            <p className="font-semibold text-ink">
              Alert above {engine.formatChance(hover.threshold)}
            </p>
            <p className="tabular text-ink-2">{engine.formatInt(hover.alerts)} alerts</p>
            <p className="tabular text-ink-2">
              {hover.tp} of {lab.meta.splits.test.frauds} frauds caught
            </p>
            <p className="tabular text-ink-2">Net {engine.formatSignedUsd(hover.net)}</p>
            <p className="mt-1 text-xs text-ink-3">Click to use this cut-off</p>
          </div>
        )}
      </div>
      <figcaption className="mt-3 text-sm text-ink-2">
        Each alert costs the review fee; each missed fraud costs its amount. The best cut-off moves
        as the review cost changes.
      </figcaption>
      <button
        type="button"
        onClick={() => use(best.threshold)}
        className="mt-4 inline-flex h-11 items-center rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface sm:h-9"
      >
        Use the best cut-off ({engine.formatChance(best.threshold)}) on the radar
      </button>
    </figure>
  );
}
