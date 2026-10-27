import { useElementWidth } from "@/hooks/useElementWidth";
import type { IrisRun } from "@/lib/engine";

const H = 150;
const PAD = { left: 52, right: 12, top: 10, bottom: 30 };

/** What the algorithm optimises, frame by frame, with the frame shown marked. */
export function ObjectiveChart({
  run,
  frameIndex,
  onFrame,
}: {
  run: IrisRun;
  frameIndex: number;
  onFrame: (frame: number) => void;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const kmeans = run.method === "kmeans";
  const values = run.frames.map((f) => (kmeans ? f.inertia : f.logLikelihood) ?? NaN);
  const finite = values.filter((v) => Number.isFinite(v));
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const margin = (hi - lo) * 0.1 || Math.abs(hi) * 0.05 || 1;
  const n = Math.max(1, values.length - 1);
  const pw = Math.max(1, width - PAD.left - PAD.right);
  const ph = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / n) * pw;
  const y = (v: number) => PAD.top + (1 - (v - (lo - margin)) / (hi - lo + 2 * margin)) * ph;
  const fmt = (v: number) => (kmeans ? v.toFixed(1) : v.toFixed(3));
  const title = kmeans
    ? `Inertia: within-cluster sum of squares${run.scaled ? " (standardized units)" : ""}, lower is better`
    : "Log-likelihood per flower, higher is better";
  const current = values[frameIndex];

  return (
    <figure className="m-0">
      <figcaption className="text-sm font-medium text-ink">{title}</figcaption>
      <div ref={ref} className="mt-2">
        {width > 0 && finite.length > 0 && (
          <svg
            width={width}
            height={H}
            className="block"
            role="img"
            aria-label={`${title}. ${values
              .map((v, i) => `iteration ${run.frames[i]?.iteration ?? i}: ${fmt(v)}`)
              .join("; ")}.`}
          >
            {[lo, hi].map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + pw} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
                <text
                  x={PAD.left - 6}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--ink-3)"
                >
                  {fmt(v)}
                </text>
              </g>
            ))}
            {run.frames.map((f, i) =>
              n <= 12 || i % Math.ceil(n / 12) === 0 || i === n ? (
                <text
                  key={i}
                  x={x(i)}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={11}
                  fill={i === frameIndex ? "var(--ink)" : "var(--ink-3)"}
                  fontWeight={i === frameIndex ? 600 : 400}
                >
                  {f.iteration}
                </text>
              ) : null,
            )}
            <path
              d={values
                .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
                .join("")}
              fill="none"
              stroke="var(--iris)"
              strokeWidth={2}
            />
            {values.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={i === frameIndex ? 6 : 3.5}
                fill={i === frameIndex ? "var(--page)" : "var(--iris)"}
                stroke={i === frameIndex ? "var(--ink)" : "var(--page)"}
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onClick={() => onFrame(i)}
              />
            ))}
          </svg>
        )}
      </div>
      {current !== undefined && Number.isFinite(current) && (
        <p className="tabular mt-1 text-xs text-ink-3">
          Iteration {run.frames[frameIndex]?.iteration}: {fmt(current)}
        </p>
      )}
    </figure>
  );
}
