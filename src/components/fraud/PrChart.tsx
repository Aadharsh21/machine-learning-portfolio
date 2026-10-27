import { useMemo } from "react";
import { Legend } from "@/components/site/Legend";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { Engine, FraudLab, FraudPolicy, ModelKey } from "@/lib/engine";

const M = { left: 52, right: 16, top: 14, bottom: 46 };
const TICKS = [0, 0.25, 0.5, 0.75, 1];
const COLOR: Record<ModelKey, string> = { v1: "var(--series-2)", v2: "var(--series-1)" };
const NAME: Record<ModelKey, string> = { v1: "v1: logistic regression", v2: "v2: LightGBM" };

/** Precision against recall for both models, with the current policy marked. */
export function PrChart({
  lab,
  engine,
  policy,
}: {
  lab: FraudLab;
  engine: Engine;
  policy: FraudPolicy;
}) {
  const [wrap, width] = useElementWidth<HTMLDivElement>();
  const w = Math.max(240, width);
  const h = Math.min(w, 340);
  const pw = w - M.left - M.right;
  const ph = h - M.top - M.bottom;
  const x = (v: number) => M.left + v * pw;
  const y = (v: number) => M.top + (1 - v) * ph;
  const pct = (v: number) => engine.formatPercent(v);
  const outcome = lab.evaluate(policy);
  // Precision and recall at the engine's sweep of 181 cut-offs (precision doesn't depend on
  // the review cost). meta.pr_curves in this release spends 199 of its 200 points on the
  // low-precision tail, so it can't show the part of the curve that matters.
  const curves = useMemo(
    () => ({
      v1: lab.tradeoff("v1", lab.meta.review_cost).points,
      v2: lab.tradeoff("v2", lab.meta.review_cost).points,
    }),
    [lab],
  );
  const line = (key: ModelKey) =>
    curves[key]
      .flatMap((pt) => (pt.precision === null ? [] : [[pt.recall, pt.precision] as const]))
      .map(([r, p], i) => `${i ? "L" : "M"}${x(r).toFixed(1)},${y(p).toFixed(1)}`)
      .join("");

  return (
    <figure className="m-0 min-w-0">
      <h3 className="font-condensed text-2xl text-ink">Precision against recall</h3>
      <div ref={wrap} className="mt-3">
        {width > 0 && (
          <svg
            width={w}
            height={h}
            className="block max-w-full"
            role="img"
            aria-label={`Precision against recall on the test stream for v1 and v2. v2 stays far more precise at every useful recall.${
              outcome.precision !== null && outcome.recall !== null
                ? ` The current policy catches ${pct(outcome.recall)} of frauds with ${pct(outcome.precision)} of alerts being fraud.`
                : ""
            }`}
          >
            {TICKS.map((t) => (
              <g key={t}>
                <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
                <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--rule)" />
                <text x={x(0) - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--ink-3)">
                  {pct(t)}
                </text>
                <text x={x(t)} y={y(0) + 18} textAnchor="middle" fontSize={12} fill="var(--ink-3)">
                  {pct(t)}
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
              Recall: share of frauds caught
            </text>
            <text
              transform={`translate(14 ${M.top + ph / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={12}
              fill="var(--ink-2)"
            >
              Precision: alerts that are fraud
            </text>
            {(["v1", "v2"] as const).map((k) => (
              <path key={k} d={line(k)} fill="none" stroke={COLOR[k]} strokeWidth={2} />
            ))}
            {outcome.precision !== null && outcome.recall !== null && (
              <g>
                <circle
                  cx={x(outcome.recall)}
                  cy={y(outcome.precision)}
                  r={6}
                  fill={COLOR[policy.model]}
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
                  stroke="var(--page)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  Your policy
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
      <Legend
        className="mt-2"
        items={[
          { label: NAME.v1, color: COLOR.v1, shape: "line" },
          { label: NAME.v2, color: COLOR.v2, shape: "line" },
        ]}
      />
      <figcaption className="mt-3 text-sm text-ink-2">
        Both models have a ROC AUC of 0.980, so ROC can't tell them apart. Precision at a useful
        recall can. v1 gives hundreds of payments a score above 99.99%, so its curve starts part-way
        along.
      </figcaption>
    </figure>
  );
}
