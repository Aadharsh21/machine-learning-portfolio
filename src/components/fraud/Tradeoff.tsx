import { useMemo, useState } from "react";
import { Legend } from "@/components/site/Legend";
import { useElementWidth } from "@/hooks/useElementWidth";
import { kUsd, niceTicks } from "@/lib/axis";
import type { Engine, FraudLab, FraudPolicy, ModelKey, TradeoffPoint } from "@/lib/engine";

interface Props {
  lab: FraudLab;
  engine: Engine;
  policy: FraudPolicy;
  /** switches the rule to "alert above a probability" at this cut-off */
  onThreshold: (t: number) => void;
}

const Z = 9.2;
const logit = (p: number) => Math.log(p / (1 - p));
const pctLabel = (p: number) => `${+(p * 100).toPrecision(3)}%`;
const MODELS: ModelKey[] = ["v1", "v2"];
const STROKE: Record<ModelKey, { color: string; dash?: string }> = {
  v1: { color: "var(--ink-3)", dash: "6 4" },
  v2: { color: "var(--fraud)" },
};

const tooltip =
  "pointer-events-none absolute z-10 w-max max-w-[17rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm text-ink shadow-sm";

/** Net result at every cut-off for both models, at the current review cost. */
function NetChart({ lab, engine, policy, onThreshold }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const cost = policy.reviewCost;
  const curves = useMemo(
    () => ({ v1: lab.tradeoff("v1", cost), v2: lab.tradeoff("v2", cost) }),
    [lab, cost],
  );
  // tradeoff points run strict to lenient; the chart reads lenient (left) to strict (right)
  const series = useMemo(
    () => ({ v1: [...curves.v1.points].reverse(), v2: [...curves.v2.points].reverse() }),
    [curves],
  );

  const narrow = width < 520;
  const h = narrow ? 280 : 340;
  const pad = { left: 56, right: 16, top: 28, bottom: 44 };
  const pw = Math.max(1, width - pad.left - pad.right);
  const ph = h - pad.top - pad.bottom;
  const top = Math.max(curves.v1.best.net, curves.v2.best.net) * 1.15;
  const floor = -lab.meta.test_fraud_amount * 1.25;
  const x = (t: number) => pad.left + ((Math.max(-Z, Math.min(Z, logit(t))) + Z) / (2 * Z)) * pw;
  const y = (v: number) => pad.top + ((top - v) / (top - floor)) * ph;
  const xTicks = narrow
    ? [0.0001, 0.01, 0.5, 0.99, 0.9999]
    : [0.0001, 0.001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.999, 0.9999];
  const yTicks = niceTicks(floor, top);
  const path = (pts: TradeoffPoint[]) =>
    pts
      .map((p, i) => `${i ? "L" : "M"}${x(p.threshold).toFixed(1)},${y(p.net).toFixed(1)}`)
      .join("");

  const n = series.v2.length;
  // el is the hit area, which already starts at the plot's left edge
  const pick = (clientX: number, el: SVGElement) => {
    const r = el.getBoundingClientRect();
    const share = (clientX - r.left) / pw;
    return Math.max(0, Math.min(n - 1, Math.round(share * (n - 1))));
  };
  const hv1 = hover === null ? undefined : series.v1[hover];
  const hv2 = hover === null ? undefined : series.v2[hover];
  const best = curves.v2.best;
  const yourT = policy.rule === "threshold" ? (policy.threshold ?? 0.5) : null;

  const summary = `Net result against the alert cut-off at ${engine.formatUsd(cost)} per review. v2 does best alerting above ${engine.formatChance(
    best.threshold,
  )}: ${best.tp} frauds caught, ${engine.formatInt(best.fp)} false alarms, net ${engine.formatSignedUsd(
    best.net,
  )}. v1 does best alerting above ${engine.formatChance(curves.v1.best.threshold)}, net ${engine.formatSignedUsd(
    curves.v1.best.net,
  )}.`;

  return (
    <figure className="m-0 min-w-0">
      <h3 className="font-condensed text-2xl text-ink">Net result at every cut-off</h3>
      <Legend
        className="mt-3"
        items={[
          { label: "v2: LightGBM", color: STROKE.v2.color, shape: "line" },
          { label: "v1: logistic regression", color: STROKE.v1.color, shape: "dash" },
        ]}
      />
      <div ref={ref} className="relative mt-3">
        {width > 0 && (
          <svg
            width={width}
            height={h}
            className="block"
            role="img"
            aria-label={summary}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <clipPath id="net-plot">
                <rect x={pad.left} y={pad.top} width={pw} height={ph} />
              </clipPath>
            </defs>
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={pad.left}
                  x2={pad.left + pw}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={v === 0 ? "var(--ink-3)" : "var(--rule)"}
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 8}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--ink-3)"
                >
                  {kUsd(v)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={pad.top}
                  y2={pad.top + ph}
                  stroke="var(--rule)"
                  strokeWidth={1}
                />
                <text
                  x={x(t)}
                  y={pad.top + ph + 18}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--ink-3)"
                >
                  {pctLabel(t)}
                </text>
              </g>
            ))}
            <text
              x={pad.left + pw / 2}
              y={h - 6}
              textAnchor="middle"
              fontSize={13}
              fill="var(--ink-2)"
            >
              Alert when the chance of fraud is above
            </text>
            <g clipPath="url(#net-plot)">
              {MODELS.map((m) => (
                <path
                  key={m}
                  d={path(series[m])}
                  fill="none"
                  stroke={STROKE[m].color}
                  strokeWidth={2}
                  strokeDasharray={STROKE[m].dash}
                  strokeLinejoin="round"
                />
              ))}
            </g>
            {yourT !== null && (
              <g>
                <line
                  x1={x(yourT)}
                  x2={x(yourT)}
                  y1={pad.top}
                  y2={pad.top + ph}
                  stroke="var(--ink)"
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                />
                <text
                  x={x(yourT) + (x(yourT) > pad.left + pw - 90 ? -6 : 6)}
                  y={pad.top - 10}
                  textAnchor={x(yourT) > pad.left + pw - 90 ? "end" : "start"}
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--ink)"
                >
                  Your cut-off
                </text>
              </g>
            )}
            {MODELS.map((m) => {
              const b = curves[m].best;
              return (
                <circle
                  key={m}
                  cx={x(b.threshold)}
                  cy={y(b.net)}
                  r={5}
                  fill={STROKE[m].color}
                  stroke="var(--page)"
                  strokeWidth={2}
                />
              );
            })}
            <text
              x={x(best.threshold)}
              y={y(best.net) - 12}
              textAnchor={x(best.threshold) > pad.left + pw * 0.6 ? "end" : "middle"}
              fontSize={12}
              fill="var(--ink)"
            >
              Best: {engine.formatSignedUsd(best.net)}
            </text>
            {hover !== null && hv2 && (
              <line
                x1={x(hv2.threshold)}
                x2={x(hv2.threshold)}
                y1={pad.top}
                y2={pad.top + ph}
                stroke="var(--ink-2)"
                strokeWidth={1}
              />
            )}
            {hover !== null &&
              MODELS.map((m) => {
                const p = series[m][hover];
                return p && p.net >= floor ? (
                  <circle
                    key={m}
                    cx={x(p.threshold)}
                    cy={y(p.net)}
                    r={4}
                    fill={STROKE[m].color}
                    stroke="var(--page)"
                    strokeWidth={2}
                  />
                ) : null;
              })}
            <rect
              x={pad.left}
              y={pad.top}
              width={pw}
              height={ph}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseMove={(e) => setHover(pick(e.clientX, e.currentTarget))}
              onClick={(e) => {
                const p = series.v2[pick(e.clientX, e.currentTarget)];
                if (p) onThreshold(Number(p.threshold.toPrecision(4)));
              }}
            />
          </svg>
        )}
        {hv1 && hv2 && hover !== null && (
          <div
            aria-hidden
            className={tooltip}
            style={{
              left: x(hv2.threshold),
              top: pad.top,
              transform: `translateX(${x(hv2.threshold) > width / 2 ? "calc(-100% - 10px)" : "10px"})`,
            }}
          >
            <p className="font-semibold">Alert above {engine.formatChance(hv2.threshold)}</p>
            {[
              ["v2", hv2],
              ["v1", hv1],
            ].map(([label, p]) => {
              const pt = p as TradeoffPoint;
              return (
                <p key={label as string} className="tabular mt-1 text-ink-2">
                  <span className="font-medium text-ink">{label as string}:</span> {pt.tp} caught,{" "}
                  {engine.formatInt(pt.fp)} false alarms,{" "}
                  <span className="font-medium text-ink">{engine.formatSignedUsd(pt.net)}</span>
                </p>
              );
            })}
            <p className="mt-1 text-xs text-ink-3">Click to use this cut-off</p>
          </div>
        )}
      </div>
      <figcaption className="mt-3 text-sm text-ink-2">
        Fraud blocked minus {engine.formatUsd(cost)} for every alert reviewed, change the review
        cost above and the curves move. Lines that drop off the bottom lose more than all the fraud
        in the window. Click the chart to try a cut-off on the radar.
      </figcaption>
      <button
        type="button"
        onClick={() => onThreshold(Number(best.threshold.toPrecision(4)))}
        className="mt-4 inline-flex items-center rounded-sm border border-rule-strong px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
      >
        Use v2's best cut-off ({engine.formatChance(best.threshold)})
      </button>
    </figure>
  );
}

/** Precision against recall for both models, with the current rule's operating point. */
function PrCurve({ lab, engine, policy }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const size = Math.min(width, 420);
  const pad = { left: 52, right: 14, top: 14, bottom: 44 };
  const pw = Math.max(1, size - pad.left - pad.right);
  const ph = Math.max(1, size - pad.top - pad.bottom);
  const x = (r: number) => pad.left + r * pw;
  const y = (p: number) => pad.top + (1 - p) * ph;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  // from the cut-off sweep (even steps in log-odds) rather than meta.pr_curves, whose points
  // bunch up at the lenient end and skip most of the high-precision region
  const curves = useMemo(() => {
    const of = (m: ModelKey) =>
      lab
        .tradeoff(m, 0)
        .points.flatMap((p): [number, number][] =>
          p.precision === null ? [] : [[p.recall, p.precision]],
        );
    return { v1: of("v1"), v2: of("v2") };
  }, [lab]);
  const path = (pts: [number, number][]) =>
    pts.map(([r, p], i) => `${i ? "L" : "M"}${x(r).toFixed(1)},${y(p).toFixed(1)}`).join("");
  const outcome = useMemo(() => lab.evaluate(policy), [lab, policy]);
  const nearest = (m: ModelKey, recall: number) =>
    curves[m].reduce((a, b) => (Math.abs(b[0] - recall) < Math.abs(a[0] - recall) ? b : a));
  const ap = (m: ModelKey) =>
    lab.meta.models[m === "v1" ? "v1_undersampled_logistic" : "v2_lightgbm"]?.test.avg_precision ??
    0;

  return (
    <figure className="m-0 min-w-0">
      <h3 className="font-condensed text-2xl text-ink">Precision and recall</h3>
      <Legend
        className="mt-3"
        items={[
          {
            label: `v2 (average precision ${ap("v2").toFixed(3)})`,
            color: STROKE.v2.color,
            shape: "line",
          },
          { label: `v1 (${ap("v1").toFixed(3)})`, color: STROKE.v1.color, shape: "dash" },
        ]}
      />
      <div ref={ref} className="relative mt-3">
        {size > 0 && (
          <svg
            width={size}
            height={size}
            className="block"
            role="img"
            aria-label={`Precision-recall curves. v2's curve sits above v1's at almost every recall: for the same share of frauds caught, more of its alerts are real fraud. Your rule: ${
              outcome.recall === null ? "no frauds" : engine.formatPercent(outcome.recall)
            } of frauds caught, ${
              outcome.precision === null
                ? "no alerts"
                : `${engine.formatPercent(outcome.precision)} of alerts are fraud`
            }.`}
            onMouseLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
                <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--rule)" />
                <text x={x(0) - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--ink-3)">
                  {engine.formatPercent(t)}
                </text>
                <text x={x(t)} y={y(0) + 18} textAnchor="middle" fontSize={12} fill="var(--ink-3)">
                  {engine.formatPercent(t)}
                </text>
              </g>
            ))}
            <text
              x={pad.left + pw / 2}
              y={size - 6}
              textAnchor="middle"
              fontSize={13}
              fill="var(--ink-2)"
            >
              Recall: share of frauds caught
            </text>
            <text
              transform={`translate(14 ${pad.top + ph / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={13}
              fill="var(--ink-2)"
            >
              Precision: alerts that are fraud
            </text>
            {MODELS.map((m) => (
              <path
                key={m}
                d={path(curves[m])}
                fill="none"
                stroke={STROKE[m].color}
                strokeWidth={2}
                strokeDasharray={STROKE[m].dash}
                strokeLinejoin="round"
              />
            ))}
            {hover !== null &&
              MODELS.map((m) => {
                const [r, p] = nearest(m, hover);
                return (
                  <circle
                    key={m}
                    cx={x(r)}
                    cy={y(p)}
                    r={4}
                    fill={STROKE[m].color}
                    stroke="var(--page)"
                    strokeWidth={2}
                  />
                );
              })}
            {outcome.recall !== null && outcome.precision !== null && (
              <g>
                <circle
                  cx={x(outcome.recall)}
                  cy={y(outcome.precision)}
                  r={6}
                  fill="var(--page)"
                  stroke="var(--ink)"
                  strokeWidth={2}
                />
                <text
                  x={x(outcome.recall) + (outcome.recall > 0.6 ? -10 : 10)}
                  y={y(outcome.precision) + (outcome.precision > 0.85 ? 18 : -10)}
                  textAnchor={outcome.recall > 0.6 ? "end" : "start"}
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--ink)"
                >
                  Your rule
                </text>
              </g>
            )}
            <rect
              x={pad.left}
              y={pad.top}
              width={pw}
              height={ph}
              fill="transparent"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setHover(Math.max(0, Math.min(1, (e.clientX - r.left) / pw)));
              }}
            />
          </svg>
        )}
        {hover !== null && size > 0 && (
          <div
            aria-hidden
            className={tooltip}
            style={{
              left: x(hover),
              top: pad.top + ph,
              transform: `translate(${hover > 0.5 ? "calc(-100% - 10px)" : "10px"}, calc(-100% - 8px))`,
            }}
          >
            <p className="font-semibold">Catching {engine.formatPercent(hover)} of frauds</p>
            {MODELS.slice()
              .reverse()
              .map((m) => (
                <p key={m} className="tabular mt-1 text-ink-2">
                  <span className="font-medium text-ink">{m}:</span>{" "}
                  {engine.formatPercent(nearest(m, hover)[1])} of alerts are fraud
                </p>
              ))}
          </div>
        )}
      </div>
      <figcaption className="mt-3 max-w-[26rem] text-sm text-ink-2">
        Higher is better. The ring is your current rule on the radar. v1 scores hundreds of payments
        above 99.99%, so its curve can't be split any finer and starts part-way down.
      </figcaption>
    </figure>
  );
}

/** "Where to set the cut-off": money against cut-off, and the precision-recall trade-off. */
export function Tradeoff(props: Props) {
  return (
    <section aria-labelledby="tradeoff-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="tradeoff-h" className="font-condensed text-3xl text-ink">
        Where to set the cut-off
      </h2>
      <p className="mt-2 max-w-3xl text-ink-2">
        A lower cut-off catches more fraud but buries the team in false alarms. Counting both in
        dollars shows where the balance lies, and how far apart the two models are.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <NetChart {...props} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <PrCurve {...props} />
        </div>
      </div>
    </section>
  );
}
