import type { Engine, IrisRun } from "@/lib/engine";
import { SPECIES_SHAPE, capitalize, markerPath } from "./clusters";

interface Props {
  engine: Engine;
  species: string[];
  run: IrisRun;
  colors: string[];
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="font-condensed tabular mt-1 text-4xl leading-none text-ink">{value}</dd>
    </div>
  );
}

/** How the finished run compares with the species the algorithm never saw. */
export function Scoreboard({ engine, species, run, colors }: Props) {
  const { score } = run;
  const k = colors.length;
  const most = Math.max(1, ...score.counts.flat());
  const kmeans = run.method === "kmeans";
  const objective = (v: number) => (kmeans ? v.toFixed(2) : v.toFixed(4));

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <section aria-labelledby="score-h" className="lg:col-span-4">
        <h3 id="score-h" className="font-condensed text-2xl text-ink">
          Where it landed
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-rule p-5">
          <div className="col-span-2">
            <Stat
              value={score.ari.toFixed(3)}
              label="Agreement with the species (ARI: 1 is perfect, 0 is chance)"
            />
          </div>
          <Stat
            value={engine.formatPercent(score.accuracy, 1)}
            label="Share in their species' cluster"
          />
          <Stat
            value={score.silhouette === null ? "–" : score.silhouette.toFixed(3)}
            label="Silhouette (how separate the clusters look)"
          />
        </dl>
      </section>

      <section aria-labelledby="matrix-h" className="min-w-0 lg:col-span-4">
        <h3 id="matrix-h" className="font-condensed text-2xl text-ink">
          Species by cluster
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <caption className="sr-only">
              Flowers of each species (rows) in each cluster (columns); the cluster matched to each
              species is outlined
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-2 text-left font-medium text-ink-2">
                  Species
                </th>
                {colors.map((c, j) => (
                  <th key={j} scope="col" className="px-1 py-1 text-center font-medium text-ink-2">
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
                <tr key={s}>
                  <th
                    scope="row"
                    className="py-1 pr-2 text-left font-normal whitespace-nowrap text-ink"
                  >
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
                    const share = n / most;
                    return (
                      <td
                        key={j}
                        className={`tabular h-9 min-w-9 rounded-sm px-1 text-center ${
                          share > 0.55 ? "font-semibold text-page" : n ? "text-ink" : "text-ink-3"
                        } ${matched ? "outline-2 -outline-offset-2 outline-ink" : ""}`}
                        style={{
                          background: n
                            ? `color-mix(in oklab, var(--iris) ${Math.round(12 + share * 78)}%, var(--page))`
                            : "var(--surface)",
                        }}
                      >
                        {n}
                        {matched && <span className="sr-only"> (matched)</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          Darker cells hold more flowers. Outlined: the cluster matched to each species. On the
          chart, flowers outside their species' cluster have a dark outline.
        </p>
      </section>

      {run.restarts > 1 && (
        <section aria-labelledby="tries-h" className="min-w-0 lg:col-span-4">
          <h3 id="tries-h" className="font-condensed text-2xl text-ink">
            {run.restarts} starts
          </h3>
          <ol className="mt-4 max-h-64 overflow-y-auto rounded-md border border-rule text-sm">
            {run.tries.map((t) => {
              const kept = t.seed === run.bestSeed;
              return (
                <li
                  key={t.seed}
                  className={`tabular flex justify-between gap-3 border-b border-rule px-3 py-1.5 last:border-b-0 ${
                    kept ? "bg-surface font-semibold text-ink" : "text-ink-2"
                  }`}
                >
                  <span>
                    Start {t.seed}: {kmeans ? "inertia" : "log-likelihood"} {objective(t.objective)}{" "}
                    → ARI {t.ari.toFixed(3)}
                  </span>
                  {kept && <span>kept</span>}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm text-ink-2">
            k-means and EM only find a local best, so scikit-learn keeps the best of several starts.
            That is how the published numbers were made.
          </p>
        </section>
      )}
    </div>
  );
}
