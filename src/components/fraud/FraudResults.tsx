import { DataTable } from "@/components/site/DataTable";
import type { Engine, FraudMeta } from "@/lib/engine";

const ROWS = ["v1_undersampled_logistic", "weighted_logistic", "v2_lightgbm"] as const;

const FEATURE_LABEL: Record<string, string> = {
  LogAmount: "Amount",
  HourSin: "Time of day (sine)",
  HourCos: "Time of day (cosine)",
};

/** The graded comparison on the last 9.3 hours, and how the two versions were built. */
export function FraudResults({ meta, engine }: { meta: FraudMeta; engine: Engine }) {
  const models = ROWS.flatMap((key) => {
    const m = meta.models[key];
    return m ? [{ key, label: m.label, test: m.test }] : [];
  });
  const v1 = meta.models["v1_undersampled_logistic"]?.test;
  const elr = meta.models["v2_lightgbm"]?.test.expected_loss_rule;
  const review = engine.formatUsd(meta.review_cost);
  const hours = meta.test_hours.toFixed(1);
  const test = meta.splits.test;

  return (
    <>
      <section aria-labelledby="graded-h" className="mt-16 border-t border-rule pt-10">
        <h2 id="graded-h" className="font-condensed text-3xl text-ink">
          Graded on the last {hours} hours
        </h2>
        <div className="mt-6">
          <DataTable
            caption={`${engine.formatInt(test.rows)} payments, ${test.frauds} of them fraud, scored at a 50% cut-off`}
            rows={models}
            rowKey={(m) => m.key}
            highlight={(m) => m.key === "v2_lightgbm"}
            columns={[
              { key: "model", header: "Model", render: (m) => m.label },
              {
                key: "ap",
                header: "Avg. precision (95% interval)",
                numeric: true,
                render: (m) => (
                  <>
                    {m.test.avg_precision.toFixed(3)}{" "}
                    <span className="text-ink-3">
                      ({m.test.avg_precision_ci95[0].toFixed(3)} to{" "}
                      {m.test.avg_precision_ci95[1].toFixed(3)})
                    </span>
                  </>
                ),
              },
              {
                key: "auc",
                header: "ROC AUC",
                numeric: true,
                render: (m) => m.test.roc_auc.toFixed(3),
              },
              {
                key: "caught",
                header: "Frauds caught",
                numeric: true,
                render: (m) => `${m.test.tp} of ${m.test.tp + m.test.fn}`,
              },
              {
                key: "fp",
                header: "False alarms",
                numeric: true,
                render: (m) => engine.formatInt(m.test.fp),
              },
              {
                key: "aph",
                header: "Alerts per hour",
                numeric: true,
                render: (m) => m.test.alerts_per_hour.toFixed(1),
              },
              {
                key: "net",
                header: `Net at ${review} per review`,
                numeric: true,
                render: (m) => engine.formatSignedUsd(m.test.net_savings),
              },
            ]}
          />
        </div>
        {elr && (
          <p className="mt-4 max-w-3xl text-sm text-ink-2">
            v2 with the expected-loss rule (alert when P(fraud) × amount &gt; {review}): {elr.tp}{" "}
            caught, {engine.formatInt(elr.fp)} false alarms, net{" "}
            {engine.formatSignedUsd(elr.net_savings)}. It catches fewer frauds but the expensive
            ones.
          </p>
        )}
      </section>

      <section aria-labelledby="fraud-how-h" className="mt-16 border-t border-rule pt-10">
        <h2 id="fraud-how-h" className="font-condensed text-3xl text-ink">
          How the model works
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-5 font-serif text-lg leading-relaxed text-ink-2 lg:col-span-7">
            <p>
              v1 balanced its data by throwing away legitimate payments until it had 50/50, trained
              a logistic regression and graded itself on a balanced sample. Rebuilt and graded on
              the real stream, the same procedure raises{" "}
              {v1 ? engine.formatInt(v1.fp) : "thousands of"} false alarms in {hours} hours, which
              costs more in review time than the fraud it stops.
            </p>
            <p>
              v2 splits by time: it trains on the first 60% of payments in time order, uses the next
              15% to decide when to stop adding trees, and is graded on the last 25% (
              {engine.formatInt(test.rows)} payments, {test.frauds} frauds) at the true fraud rate.
              It uses average precision instead of accuracy, and a simple cost model: each alert
              costs {review} to review and each missed fraud costs its amount. LightGBM learns from
              every training payment, with no undersampling.
            </p>
          </div>
          <div className="lg:col-span-5">
            <h3 className="font-condensed text-2xl text-ink">What v2 listens to</h3>
            <ol
              className="mt-4 space-y-1.5"
              aria-label="Average size of each input's SHAP value on test payments, largest first"
            >
              {meta.importance.slice(0, 10).map((i) => (
                <li
                  key={i.feature}
                  className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3"
                >
                  <span className="text-sm text-ink">{FEATURE_LABEL[i.feature] ?? i.feature}</span>
                  <span className="h-3 rounded-[2px] bg-surface" aria-hidden>
                    <span
                      className="block h-full rounded-[2px] bg-fraud"
                      style={{
                        width: `${(i.mean_abs_shap / (meta.importance[0]?.mean_abs_shap || 1)) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="tabular text-right text-sm text-ink-2">
                    {i.mean_abs_shap.toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-ink-2">
              Average size of each input's SHAP value on test payments, in log-odds.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
