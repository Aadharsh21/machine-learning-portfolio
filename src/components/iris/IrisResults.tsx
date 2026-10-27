import { DataTable } from "@/components/site/DataTable";
import type { Engine, IrisMeta } from "@/lib/engine";
import type { IrisSettings } from "./Playground";

const ROWS = ["kmeans_raw", "kmeans_scaled", "ward_raw", "gmm_raw"] as const;
// playground settings that reproduce each published row (Ward isn't in the playground)
const TRY: Partial<Record<(typeof ROWS)[number], Partial<IrisSettings>>> = {
  kmeans_raw: { method: "kmeans", k: 3, scaled: false, best: true, seed: 0 },
  kmeans_scaled: { method: "kmeans", k: 3, scaled: true, best: true, seed: 0 },
  gmm_raw: { method: "gmm", k: 3, best: true, seed: 0 },
};

interface Props {
  meta: IrisMeta;
  engine: Engine;
  onTry: (patch: Partial<IrisSettings>) => void;
}

/** "Two lessons": scaling and model shape, then the published comparison. */
export function IrisResults({ meta, engine, onTry }: Props) {
  const rows = ROWS.flatMap((key) => {
    const m = meta.methods[key];
    return m ? [{ key, ...m }] : [];
  });
  const raw = meta.methods["kmeans_raw"];
  const scaled = meta.methods["kmeans_scaled"];
  const gmm = meta.methods["gmm_raw"];
  const pct = (v: number) => engine.formatPercent(v, 1);

  return (
    <section aria-labelledby="lessons-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="lessons-h" className="font-condensed text-3xl text-ink">
        Two lessons
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {raw && scaled && (
          <div className="rounded-lg border border-rule p-5">
            <h3 className="font-condensed text-2xl text-ink">Scaling is a choice</h3>
            <p className="mt-2 font-serif text-lg leading-relaxed text-ink-2">
              Standardizing drops agreement with the species from ARI {raw.ari.toFixed(3)} to{" "}
              {scaled.ari.toFixed(3)}, because it shrinks the informative petal measurements to the
              weight of the noisiest one.
            </p>
          </div>
        )}
        {raw && gmm && (
          <div className="rounded-lg border border-rule p-5">
            <h3 className="font-condensed text-2xl text-ink">Match the model to the shape</h3>
            <p className="mt-2 font-serif text-lg leading-relaxed text-ink-2">
              k-means assumes round clusters of similar size. A full-covariance Gaussian mixture
              fits the elongated species and puts {pct(gmm.matched_accuracy)} of flowers in their
              species' cluster (k-means: {pct(raw.matched_accuracy)}).
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 max-w-3xl">
        <DataTable
          caption="Published results, k = 3"
          rows={rows}
          rowKey={(r) => r.key}
          highlight={(r) => r.key === "gmm_raw"}
          columns={[
            {
              key: "m",
              header: "Method",
              render: (r) => {
                const patch = TRY[r.key];
                return patch ? (
                  <button
                    type="button"
                    className="-my-2 min-h-11 text-left underline underline-offset-2 hover:text-ink-2 lg:my-0 lg:min-h-0"
                    onClick={() => onTry(patch)}
                  >
                    {r.label}
                  </button>
                ) : (
                  r.label
                );
              },
            },
            { key: "ari", header: "ARI", numeric: true, render: (r) => r.ari.toFixed(3) },
            {
              key: "acc",
              header: "Share in their species' cluster",
              numeric: true,
              render: (r) => pct(r.matched_accuracy),
            },
          ]}
        />
        <p className="mt-3 text-sm text-ink-2">
          Click a method to run it in the playground. The adjusted Rand index (ARI) counts how often
          pairs of flowers are grouped the same way as the species, corrected so that random
          clusters score 0.
        </p>
      </div>
    </section>
  );
}
