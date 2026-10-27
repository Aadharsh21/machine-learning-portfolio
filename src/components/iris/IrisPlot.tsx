import { useMemo, useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { IrisFrame, IrisPlayground, IrisView } from "@/lib/engine";
import { SPECIES_SHAPE, capitalize, featureLabel, markerPath } from "./clusters";

interface Props {
  pg: IrisPlayground;
  view: IrisView;
  /** frames from the start up to the one shown, so centres can leave a trail */
  frames: IrisFrame[];
  colors: string[];
  /** cluster matched to each species (from the finished run) */
  mapping: number[];
  /** draw each flower's true species as its shape */
  showSpecies: boolean;
  label: string;
}

const PAD = { left: 52, right: 14, top: 14, bottom: 44 };

/** The 150 flowers in a 2-D view: colour is the cluster, shape the true species. */
export function IrisPlot({ pg, view, frames, colors, mapping, showSpecies, label }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const frame = frames[frames.length - 1];
  const points = useMemo(() => pg.points(view), [pg, view]);

  // fixed per view, so the axes don't move while the algorithm runs
  const domain = useMemo(() => {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const pad = (lo: number, hi: number): [number, number] => {
      const m = (hi - lo) * 0.08;
      return [lo - m, hi + m];
    };
    return {
      x: pad(Math.min(...xs), Math.max(...xs)),
      y: pad(Math.min(...ys), Math.max(...ys)),
    };
  }, [points]);

  const h = width && width < 560 ? 340 : 440;
  const pw = Math.max(1, width - PAD.left - PAD.right);
  const ph = h - PAD.top - PAD.bottom;
  const sx = (v: number) => PAD.left + ((v - domain.x[0]) / (domain.x[1] - domain.x[0])) * pw;
  const sy = (v: number) => PAD.top + (1 - (v - domain.y[0]) / (domain.y[1] - domain.y[0])) * ph;
  const ticks = (lo: number, hi: number) => {
    const step = hi - lo > 4 ? 1 : hi - lo > 2 ? 0.5 : 0.25;
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(2));
    return out;
  };

  const axis =
    view === "pca"
      ? [
          `PC1 (${Math.round((pg.explained[0] ?? 0) * 100)}% of the variation)`,
          `PC2 (${Math.round((pg.explained[1] ?? 0) * 100)}%)`,
        ]
      : [
          `${featureLabel(pg.features[view[0]] ?? "")} (cm)`,
          `${featureLabel(pg.features[view[1]] ?? "")} (cm)`,
        ];

  if (!frame) return null;
  const hp = hover === null ? undefined : points[hover];

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={h}
          className="block"
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id="iris-plot">
              <rect x={PAD.left} y={PAD.top} width={pw} height={ph} />
            </clipPath>
          </defs>
          {ticks(domain.x[0], domain.x[1]).map((v) => (
            <g key={`x${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={PAD.top} y2={PAD.top + ph} stroke="var(--rule)" />
              <text
                x={sx(v)}
                y={PAD.top + ph + 18}
                textAnchor="middle"
                fontSize={12}
                fill="var(--ink-3)"
              >
                {v}
              </text>
            </g>
          ))}
          {ticks(domain.y[0], domain.y[1]).map((v) => (
            <g key={`y${v}`}>
              <line x1={PAD.left} x2={PAD.left + pw} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" />
              <text
                x={PAD.left - 8}
                y={sy(v) + 4}
                textAnchor="end"
                fontSize={12}
                fill="var(--ink-3)"
              >
                {v}
              </text>
            </g>
          ))}
          <text
            x={PAD.left + pw / 2}
            y={h - 6}
            textAnchor="middle"
            fontSize={13}
            fill="var(--ink-2)"
          >
            {axis[0]}
          </text>
          <text
            transform={`translate(14 ${PAD.top + ph / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={13}
            fill="var(--ink-2)"
          >
            {axis[1]}
          </text>

          <g clipPath="url(#iris-plot)">
            {frame.covariances?.map((cov, c) => {
              const mean = frame.centers[c];
              if (!mean) return null;
              const pts = pg.ellipse(mean, cov, view, 2);
              const d = pts
                .map(([x, y], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
                .join("");
              return (
                <path
                  key={`e${c}`}
                  d={`${d}Z`}
                  fill={colors[c]}
                  fillOpacity={0.08}
                  stroke={colors[c]}
                  strokeWidth={1.5}
                  // browsers that can animate path data ease the ellipse between iterations
                  style={{ transitionProperty: "d", transitionDuration: "300ms" }}
                />
              );
            })}
            {points.map(([x, y], i) => {
              const cluster = frame.labels[i] ?? 0;
              const species = pg.truth[i] ?? 0;
              const wrong = mapping[species] !== cluster;
              return (
                <path
                  key={i}
                  d={markerPath(
                    showSpecies ? (SPECIES_SHAPE[species] ?? "circle") : "circle",
                    sx(x),
                    sy(y),
                    hover === i ? 6 : 4.5,
                  )}
                  fill={colors[cluster]}
                  stroke={showSpecies && wrong ? "var(--ink)" : "var(--page)"}
                  strokeWidth={showSpecies && wrong ? 1.5 : 1}
                  className="transition-[fill] duration-300"
                />
              );
            })}
            {/* each centre's path so far, then the centre itself */}
            {frame.centers.map((_, c) => {
              const trail = frames
                .map((f) => f.centers[c])
                .filter((m): m is number[] => !!m)
                .map((m) => pg.project(m, view));
              return trail.length > 1 ? (
                <polyline
                  key={`t${c}`}
                  points={trail
                    .map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={1.25}
                  strokeDasharray="2 3"
                />
              ) : null;
            })}
            {frame.centers.map((m, c) => {
              const [x, y] = pg.project(m, view);
              const X = sx(x);
              const Y = sy(y);
              // centres glide to their next position (instantly with reduced motion)
              return (
                <g
                  key={`c${c}`}
                  style={{
                    transform: `translate(${X}px, ${Y}px)`,
                    transition: "transform 300ms ease",
                  }}
                >
                  <circle r={9} fill={colors[c]} stroke="var(--ink)" strokeWidth={2} />
                  <path d="M-4,-4L4,4M4,-4L-4,4" stroke="var(--page)" strokeWidth={2.5} />
                </g>
              );
            })}
          </g>
          <rect
            x={PAD.left}
            y={PAD.top}
            width={pw}
            height={ph}
            fill="transparent"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const mx = e.clientX - r.left + PAD.left;
              const my = e.clientY - r.top + PAD.top;
              let best: number | null = null;
              let bestD = 12 * 12;
              points.forEach(([x, y], i) => {
                const d = (sx(x) - mx) ** 2 + (sy(y) - my) ** 2;
                if (d < bestD) {
                  bestD = d;
                  best = i;
                }
              });
              setHover(best);
            }}
          />
        </svg>
      )}
      {hp && hover !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 w-max max-w-[15rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm text-ink shadow-sm"
          style={{
            left: sx(hp[0]),
            top: sy(hp[1]),
            transform: `translate(${sx(hp[0]) > width / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)`,
          }}
        >
          <p className="font-semibold">
            {capitalize(pg.species[pg.truth[hover] ?? 0] ?? "")}, in cluster{" "}
            {(frame.labels[hover] ?? 0) + 1}
          </p>
          <p className="tabular mt-0.5 text-ink-2">
            Sepal {pg.X[hover]?.[0]} × {pg.X[hover]?.[1]} cm, petal {pg.X[hover]?.[2]} ×{" "}
            {pg.X[hover]?.[3]} cm
          </p>
        </div>
      )}
    </div>
  );
}
