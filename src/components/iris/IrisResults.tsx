import { DataTable } from "@/components/site/DataTable";
import type { Engine, IrisMeta } from "@/lib/engine";
import type { IrisSettings } from "./Playground";

const ROWS = ["kmeans_raw", "kmeans_scaled", "ward_raw", "gmm_raw"] as const;
// the playground settings that reproduce each published row (Ward isn't in the playground)
const TRY: Partial<Record<(typeof ROWS)[number], Partial<IrisSettings>>> = {
  kmeans_raw: { method: "kmeans", k: 3, scaled: false, starts: 10 },
  kmeans_scaled: { method: "kmeans", k: 3, scaled: true, starts: 10 },
  gmm_raw: { method: "gmm", k: 3, starts: 10 },
};

interface Props {
  meta: IrisMeta;
  engine: Engine;
  onTry: (patch: Partial<IrisSettings>) => void;
}

/** "How it works": the published comparison, and why scaling and shape matter. */
export function IrisResults({ meta, engine, onTry }: Props) {
  const rows = ROWS.flatMap((key) => {
    const m = meta.methods[key];
    return m ? [{ key, ...m }] : [];
  });
  const raw = meta.methods["kmeans_raw"];
  const scaled = meta.methods["kmeans_scaled"];
  const gmm = meta.methods["gmm_raw"];

  return (
    <section aria-labelledby="how-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="how-h" className="font-condensed text-3xl text-ink">
        How it works
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="space-y-5 font-serif text-lg leading-relaxed text-ink-2 lg:col-span-7">
          <p>
            <span className="font-sans text-base font-semibold text-ink">k-means</span> places k
            centres, gives every flower to its nearest centre, moves each centre to the middle of
            its flowers, and repeats until nothing changes. It assumes round clusters of similar
            size.{" "}
            <span className="font-sans text-base font-semibold text-ink">A Gaussian mixture</span>{" "}
            gives each cluster its own oval shape, size and tilt, and each flower a probability of
            belonging to each; it repeats until the fit stops improving.
          </p>
          {raw && scaled && (
            <p>
              <span className="font-sans text-base font-semibold text-ink">
                Scaling is a choice.
              </span>{" "}
              Standardizing every measurement to the same spread is the usual advice, but here it
              drops agreement with the species from {raw.ari.toFixed(3)} to {scaled.ari.toFixed(3)}.
              Petal size is what separates the species, and scaling shrinks it to the weight of
              sepal width, the noisiest measurement.
            </p>
          )}
          {raw && gmm && (
            <p>
              <span className="font-sans text-base font-semibold text-ink">
                Match the model to the shape.
              </span>{" "}
              Versicolor and virginica form long, tilted clouds that touch. Round k-means clusters
              cut across them; the mixture's ovals follow them, putting{" "}
              {engine.formatPercent(gmm.matched_accuracy, 1)} of flowers in their species' cluster
              against {engine.formatPercent(raw.matched_accuracy, 1)}.
            </p>
          )}
          <p>
            Everything in the playground runs in your browser and steps exactly as scikit-learn
            does, including its k-means++ starting points, so a run with the same settings gives the
            published numbers.
          </p>
        </div>
        <div className="lg:col-span-5">
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
                      className="text-left underline underline-offset-2 hover:text-ink-2"
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
                header: "In species' cluster",
                numeric: true,
                render: (r) => engine.formatPercent(r.matched_accuracy, 1),
              },
            ]}
          />
          <p className="mt-3 text-sm text-ink-2">
            Click a method to run it in the playground. The adjusted Rand index counts how often
            pairs of flowers are grouped the same way as by species, corrected so that random
            clusters score 0.
          </p>
        </div>
      </div>
    </section>
  );
}
