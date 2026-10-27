import { DataTable } from "@/components/site/DataTable";
import type { Engine, RainMeta } from "@/lib/engine";
import { Calibration } from "./Calibration";

const ROWS = ["majority", "persistence", "v1_logistic", "v2_logistic", "v2_lightgbm"] as const;

/** "How the model works": the method, calibration, the graded comparison and SHAP importance. */
export function RainResults({ meta, engine }: { meta: RainMeta; engine: Engine }) {
  const test = meta.splits.test;
  const v2Logistic = meta.models["v2_logistic"]?.test;
  const models = ROWS.flatMap((key) => {
    const m = meta.models[key];
    return m ? [{ key, label: m.label, test: m.test }] : [];
  });
  const top = meta.importance.slice(0, 12);
  const most = Math.max(...top.map((i) => i.mean_abs_shap));
  const pct1 = (v: number) => engine.formatPercent(v, 1);

  return (
    <section aria-labelledby="how-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="how-h" className="font-condensed text-3xl text-ink">
        How the model works
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="space-y-5 font-serif text-lg leading-relaxed text-ink-2 lg:col-span-7">
          <p>
            Each row of the data is one day at one station: the morning and afternoon readings, plus
            whether more than 1 mm of rain fell by 9am the next day. The model is a LightGBM
            ensemble of {engine.formatInt(meta.best_iteration)} small decision trees. It learns from
            2007 to 2014, tunes itself on 2015, and is graded on {engine.formatInt(test.rows)} days
            from 2016 and 2017 that it never saw, the same split the first version used.
          </p>
          <p>
            <span className="font-sans text-base font-semibold text-ink">
              What changed from v1.
            </span>{" "}
            The first version scaled and filled in its inputs using every row, test years included,
            so a little of the answer leaked into training. v2 fits all preprocessing on training
            days only. It adds what a forecaster would look at: how pressure, humidity, cloud and
            temperature moved between 9am and 3pm, the time of year, where the station is, and wind
            directions as compass vectors so that north-north-west sits next to north. Trees replace
            the linear model and handle missing readings on their own (sunshine is missing on 48% of
            days).
          </p>
          {v2Logistic && (
            <p>
              A logistic regression given the same new features stays at {pct1(v2Logistic.accuracy)}
              , so the gain comes from letting the model combine readings, like high humidity and
              falling pressure. When it says 70%, it rains on about 70% of those days, which is what
              makes the percentages worth showing.
            </p>
          )}
        </div>
        <div className="lg:col-span-5">
          <Calibration bins={meta.calibration} engine={engine} />
        </div>
      </div>

      <div className="mt-12">
        <DataTable
          caption="Graded on 2016-2017"
          rows={models}
          rowKey={(m) => m.key}
          highlight={(m) => m.key === "v2_lightgbm"}
          columns={[
            { key: "model", header: "Model", render: (m) => m.label },
            { key: "acc", header: "Accuracy", numeric: true, render: (m) => pct1(m.test.accuracy) },
            {
              key: "auc",
              header: "ROC AUC",
              numeric: true,
              render: (m) => m.test.roc_auc.toFixed(3),
            },
            {
              key: "ap",
              header: "Avg. precision",
              numeric: true,
              render: (m) => m.test.avg_precision.toFixed(3),
            },
            {
              key: "brier",
              header: "Brier score (lower is better)",
              numeric: true,
              render: (m) => m.test.brier.toFixed(3),
            },
          ]}
        />
        <p className="mt-4 max-w-3xl text-sm text-ink-2">
          95% bootstrap interval for v2: accuracy {pct1(meta.ci95.accuracy[0])} to{" "}
          {pct1(meta.ci95.accuracy[1])}, ROC AUC {meta.ci95.roc_auc[0].toFixed(3)} to{" "}
          {meta.ci95.roc_auc[1].toFixed(3)}. It rained on {pct1(test.rain_rate)} of test days, so
          always saying "no rain" already scores {pct1(1 - test.rain_rate)}.
        </p>
      </div>

      <div className="mt-12">
        <h3 className="font-condensed text-2xl text-ink">What the model listens to</h3>
        <ol
          className="mt-4 max-w-3xl space-y-1.5"
          aria-label="Average size of each reading's SHAP value on test days, largest first"
        >
          {top.map((i) => (
            <li
              key={i.group}
              className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_3rem]"
            >
              <span className="text-sm text-ink">{i.group}</span>
              <span className="h-3 rounded-[2px] bg-surface" aria-hidden>
                <span
                  className="block h-full rounded-[2px] bg-rain"
                  style={{ width: `${(i.mean_abs_shap / most) * 100}%` }}
                />
              </span>
              <span className="tabular text-right text-sm text-ink-2">
                {i.mean_abs_shap.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-sm text-ink-2">
          Average size of each reading's SHAP value on test days, in log-odds. Afternoon humidity
          dominates. Of the new features, station location and the 9am to 3pm pressure change matter
          most.
        </p>
      </div>
    </section>
  );
}
