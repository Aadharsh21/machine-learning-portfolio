import { useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { IrisMeta } from "@/lib/engine";

interface ChartProps {
  title: string;
  /** what the reader should look for */
  note: string;
  points: { k: number; value: number }[];
  format: (v: number) => string;
  current: number;
  onPick: (k: number) => void;
}

const PAD = { left: 44, right: 10, top: 12, bottom: 32 };

/** One measure against k, as a small line chart; click a point to use that k. */
function SmallChart({ title, note, points, format, current, onPick }: ChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const h = 190;
  const pw = Math.max(1, width - PAD.left - PAD.right);
  const ph = h - PAD.top - PAD.bottom;
  const ks = points.map((p) => p.k);
  const vs = points.map((p) => p.value);
  const k0 = Math.min(...ks);
  const k1 = Math.max(...ks);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const m = (hi - lo) * 0.12 || 1;
  const x = (k: number) => PAD.left + ((k - k0) / (k1 - k0)) * pw;
  const y = (v: number) => PAD.top + (1 - (v - (lo - m)) / (hi - lo + 2 * m)) * ph;
  const shown = hover ?? current;
  const sp = points.find((p) => p.k === shown);

  return (
    <figure className="m-0 min-w-0">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="tabular mt-0.5 min-h-5 text-sm text-ink-2">
        {sp ? `k = ${sp.k}: ${format(sp.value)}` : `k = ${current}: not computed`}
      </p>
      <div ref={ref} className="mt-2">
        {width > 0 && (
          <svg
            width={width}
            height={h}
            className="block"
            role="img"
            aria-label={`${title}: ${points.map((p) => `k ${p.k}, ${format(p.value)}`).join("; ")}. ${note}`}
            onMouseLeave={() => setHover(null)}
          >
            {[lo, (lo + hi) / 2, hi].map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + pw} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
                <text
                  x={PAD.left - 6}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--ink-3)"
                >
                  {format(v)}
                </text>
              </g>
            ))}
            {points.map((p) => (
              <text
                key={p.k}
                x={x(p.k)}
                y={h - 12}
                textAnchor="middle"
                fontSize={11}
                fill={p.k === current ? "var(--ink)" : "var(--ink-3)"}
                fontWeight={p.k === current ? 600 : 400}
              >
                {p.k}
              </text>
            ))}
            <path
              d={points.map((p, i) => `${i ? "L" : "M"}${x(p.k)},${y(p.value)}`).join("")}
              fill="none"
              stroke="var(--iris)"
              strokeWidth={2}
            />
            {points.map((p) => (
              <g key={p.k}>
                <circle
                  cx={x(p.k)}
                  cy={y(p.value)}
                  r={p.k === current ? 6 : 4}
                  fill={p.k === current ? "var(--page)" : "var(--iris)"}
                  stroke={p.k === current ? "var(--ink)" : "var(--page)"}
                  strokeWidth={2}
                />
                <circle
                  cx={x(p.k)}
                  cy={y(p.value)}
                  r={16}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover(p.k)}
                  onClick={() => onPick(p.k)}
                />
              </g>
            ))}
          </svg>
        )}
      </div>
      <figcaption className="mt-1 text-sm text-ink-2">{note}</figcaption>
    </figure>
  );
}

interface Props {
  meta: IrisMeta;
  k: number;
  scaled: boolean;
  onPick: (k: number, method: "kmeans" | "gmm") => void;
}

/** "Choosing k without the answers": elbow, silhouette, BIC, and the ARI only labels allow. */
export function ChoosingK({ meta, k, scaled, onPick }: Props) {
  const sweep = scaled ? meta.sweep.scaled : meta.sweep.raw;
  const fixed = (d: number) => (v: number) => v.toFixed(d);
  return (
    <section aria-labelledby="k-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="k-h" className="font-condensed text-3xl text-ink">
        Choosing k without the answers
      </h2>
      <p className="mt-2 max-w-3xl text-ink-2">
        Clustering is used when there are no labels, so the number of clusters has to be chosen from
        the data alone. The first three charts are what you would have; the last needs the species,
        which normally you wouldn't. Click a point to try that k.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <SmallChart
          title={`k-means sum of squares${scaled ? " (standardized)" : ""}`}
          note="Look for the elbow, where adding a cluster stops helping much. It bends softly at 2 to 3."
          points={sweep.map((p) => ({ k: p.k, value: p.inertia }))}
          format={fixed(0)}
          current={k}
          onPick={(v) => onPick(v, "kmeans")}
        />
        <SmallChart
          title="k-means silhouette"
          note="Higher means tighter, better separated clusters. It prefers 2."
          points={sweep.flatMap((p) =>
            p.silhouette === null ? [] : [{ k: p.k, value: p.silhouette }],
          )}
          format={fixed(2)}
          current={k}
          onPick={(v) => onPick(v, "kmeans")}
        />
        <SmallChart
          title="Gaussian mixture BIC"
          note="Lower is better: fit, penalised for extra parameters. 2 edges out 3."
          points={meta.gmm_bic.map((p) => ({ k: p.k, value: p.bic }))}
          format={fixed(0)}
          current={k}
          onPick={(v) => onPick(v, "gmm")}
        />
        <SmallChart
          title="k-means agreement with species (ARI)"
          note="Only possible with the labels. It peaks at 3, the true number of species."
          points={sweep.map((p) => ({ k: p.k, value: p.ari }))}
          format={fixed(2)}
          current={k}
          onPick={(v) => onPick(v, "kmeans")}
        />
      </div>
      <p className="mt-8 max-w-3xl font-serif text-lg leading-relaxed text-ink-2">
        Every unlabelled measure points to two groups, and that is an honest answer: setosa sits
        apart, while versicolor and virginica overlap. Three clusters are right because of what we
        know about the flowers, not because the data insists on it.
      </p>
    </section>
  );
}
