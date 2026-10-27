import type { Engine, IrisFrame, IrisRun, IrisScore } from "@/lib/engine";
import { SPECIES_SHAPE, capitalize, markerPath } from "./clusters";

interface Props {
  engine: Engine;
  species: string[];
  run: IrisRun;
  frame: IrisFrame;
  score: IrisScore;
  colors: string[];
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <dd className="font-condensed tabular text-4xl leading-none text-ink">{value}</dd>
      <dt className="mt-1.5 text-sm text-ink-2">{label}</dt>
    </div>
  );
}

/** How the clusters shown compare with the species the algorithm never saw. */
export function Scoreboard({ engine, species, run, frame, score, colors }: Props) {
  const k = colors.length;
  const objective =
    frame.inertia !== undefined
      ? `Within-cluster sum of squares ${frame.inertia.toFixed(1)}${run.scaled ? " (standardized units)" : " cm²"}`
      : frame.logLikelihood !== undefined
        ? `Mean log-likelihood ${frame.logLikelihood.toFixed(3)} per flower`
        : null;
  const triesAri = run.tries.map((t) => t.ari);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-rule p-5">
        <div className="col-span-2">
          <Stat
            value={score.ari.toFixed(3)}
            label="Agreement with the species (ARI: 1 is perfect, 0 is chance)"
          />
        </div>
        <Stat
          value={engine.formatPercent(score.accuracy, 1)}
          label="of flowers in their species' cluster"
        />
        <Stat
          value={score.silhouette === null ? "–" : score.silhouette.toFixed(2)}
          label="Silhouette: how separate the clusters look, without the labels"
        />
      </dl>

      <div>
        <table className="w-full border-collapse text-sm">
          <caption className="mb-2 caption-top text-left font-semibold text-ink">
            Flowers by species and cluster
          </caption>
          <thead>
            <tr className="border-b border-rule-strong">
              <th scope="col" className="py-2 pr-2 text-left font-medium text-ink-2">
                Species
              </th>
              {colors.map((c, j) => (
                <th key={j} scope="col" className="px-1 py-2 text-right font-medium text-ink-2">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: c }}
                      aria-hidden
                    />
                    <span className="sr-only">Cluster </span>
                    {j + 1}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {species.map((s, i) => (
              <tr key={s} className="border-b border-rule">
                <th scope="row" className="py-2 pr-2 text-left font-normal text-ink">
                  <span className="inline-flex items-center gap-2">
                    <svg width="12" height="12" aria-hidden>
                      <path
                        d={markerPath(SPECIES_SHAPE[i] ?? "circle", 6, 6.5, 4.5)}
                        fill="var(--ink-3)"
                      />
                    </svg>
                    {capitalize(s)}
                  </span>
                </th>
                {Array.from({ length: k }, (_, j) => {
                  const n = score.counts[i]?.[j] ?? 0;
                  const matched = score.mapping[i] === j;
                  return (
                    <td
                      key={j}
                      className={`tabular px-1 py-2 text-right ${matched ? "font-semibold text-ink" : n ? "text-ink-2" : "text-ink-3"}`}
                      style={matched ? { background: "var(--surface-2)" } : undefined}
                    >
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-3">
          Shaded: the cluster matched to each species. Outlined dots on the chart are flowers
          outside their species' cluster.
        </p>
      </div>

      <div className="space-y-1 text-sm text-ink-2">
        <p className="tabular">
          Iteration {frame.iteration} of {run.frames.length - 1}
          {frame === run.frames[run.frames.length - 1] &&
            (run.converged ? ", converged" : ", stopped at the limit")}
        </p>
        {objective && <p className="tabular">{objective}</p>}
        {run.restarts > 1 && (
          <p>
            Kept start {run.bestSeed - run.seed + 1} of {run.restarts} tried (
            {run.method === "kmeans" ? "lowest sum of squares" : "highest likelihood"}). Their ARI
            ranged from {Math.min(...triesAri).toFixed(2)} to {Math.max(...triesAri).toFixed(2)}.
          </p>
        )}
      </div>
    </div>
  );
}
