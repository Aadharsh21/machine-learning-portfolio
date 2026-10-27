import { DataTable } from "@/components/site/DataTable";
import type { Engine, FraudMeta } from "@/lib/engine";

const ROWS = ["v1_undersampled_logistic", "weighted_logistic", "v2_lightgbm"] as const;

const FEATURE_LABEL: Record<string, string> = {
  LogAmount: "Amount",
  HourSin: "Time of day (sine)",
  HourCos: "Time of day (cosine)",
};

/** "How the model works": the split, what changed from v1, the graded comparison and SHAP importance. */
export function FraudResults({ meta, engine }: { meta: FraudMeta; engine: Engine }) {
  const { train, val, test } = meta.splits;
  const models = ROWS.flatMap((key) => {
    const m = meta.models[key];
    return m ? [{ key, label: m.label, test: m.test }] : [];
  });
  const v2 = meta.models["v2_lightgbm"]?.test;
  const v1 = meta.models["v1_undersampled_logistic"]?.test;
  const top = meta.importance.slice(0, 10);
  const most = Math.max(...top.map((i) => i.mean_abs_shap));
  const review = engine.formatUsd(meta.review_cost);
  const pct = (v: number) => engine.formatPercent(v, 1);

  return (
    <section aria-labelledby="how-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="how-h" className="font-condensed text-3xl text-ink">
        How the model works
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="space-y-5 font-serif text-lg leading-relaxed text-ink-2 lg:col-span-7">
          <p>
            The data is two days of card payments, in order. The model learns from the first{" "}
            {train.end_hour.toFixed(0)} hours ({engine.formatInt(train.rows)} payments,{" "}
            {train.frauds} frauds), decides when to stop training on the next{" "}
            {(val.end_hour - val.start_hour).toFixed(1)} hours, and is graded on the last{" "}
            {meta.test_hours.toFixed(1)}: {engine.formatInt(test.rows)} payments and {test.frauds}{" "}
            frauds, at the real fraud rate. A bank only ever predicts the future, so the test
            payments all come after the training ones.
          </p>
          <p>
            <span className="font-sans text-base font-semibold text-ink">
              What changed from v1.
            </span>{" "}
            The first version threw away all but a few hundred legitimate payments to make a 50/50
            sample, trained a logistic regression on it and graded it on another balanced sample.
            That hides the cost of false alarms, which outnumber frauds 500 to 1 in real life. v2 is
            a LightGBM ensemble of {engine.formatInt(meta.best_iteration)} small decision trees
            trained on every training payment, graded on precision and on money: each alert costs{" "}
            {review} to review, and each missed fraud costs its amount.
          </p>
          {v2 && v1 && (
            <p>
              <span className="font-sans text-base font-semibold text-ink">
                Decisions by money.
              </span>{" "}
              Instead of one cut-off for every payment, the expected-loss rule raises an alert when
              the chance of fraud times the amount is more than the review cost, so a $2,000 payment
              needs less suspicion than a $2 one. With v2 it blocks{" "}
              {engine.formatUsd(v2.expected_loss_rule.blocked)} of fraud with{" "}
              {v2.expected_loss_rule.alerts} alerts, a net{" "}
              {engine.formatSignedUsd(v2.expected_loss_rule.net_savings)}. It only works with honest
              probabilities: v1, trained on a 50/50 sample, thinks fraud is hundreds of times more
              common than it is, and the same rule would raise{" "}
              {engine.formatInt(v1.expected_loss_rule.alerts)} alerts.
            </p>
          )}
        </div>
        <div className="lg:col-span-5">
          <h3 className="font-condensed text-2xl text-ink">What the model looks at</h3>
          <ol
            className="mt-4 space-y-1.5"
            aria-label="Average size of each input's SHAP value on test payments, largest first"
          >
            {top.map((i) => (
              <li
                key={i.feature}
                className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3"
              >
                <span className="text-sm text-ink">{FEATURE_LABEL[i.feature] ?? i.feature}</span>
                <span className="h-3 rounded-[2px] bg-surface" aria-hidden>
                  <span
                    className="block h-full rounded-[2px] bg-fraud"
                    style={{ width: `${(i.mean_abs_shap / most) * 100}%` }}
                  />
                </span>
                <span className="tabular text-right text-sm text-ink-2">
                  {i.mean_abs_shap.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink-2">
            Average size of each input's SHAP value on test payments, in log-odds. V1 to V28 are
            anonymised summaries of the card data (principal components), released in place of the
            raw fields to protect cardholders.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <DataTable
          caption={`Graded on the last ${meta.test_hours.toFixed(1)} hours, alerting above 50%`}
          rows={models}
          rowKey={(m) => m.key}
          highlight={(m) => m.key === "v2_lightgbm"}
          columns={[
            { key: "model", header: "Model", render: (m) => m.label },
            {
              key: "ap",
              header: "Avg. precision",
              numeric: true,
              render: (m) => m.test.avg_precision.toFixed(3),
            },
            {
              key: "prec",
              header: "Precision",
              numeric: true,
              render: (m) => pct(m.test.precision),
            },
            {
              key: "tp",
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
              key: "net",
              header: `Net at ${review}`,
              numeric: true,
              render: (m) => engine.formatSignedUsd(m.test.net_savings),
            },
          ]}
        />
        {v2 && (
          <p className="mt-4 max-w-3xl text-sm text-ink-2">
            95% bootstrap interval for v2's average precision: {v2.avg_precision_ci95[0].toFixed(3)}{" "}
            to {v2.avg_precision_ci95[1].toFixed(3)}. Weighting the classes instead of undersampling
            helps the logistic regression rank payments, but not enough to stop the false alarms.
            The window holds {engine.formatUsd(meta.test_fraud_amount)} of fraud in all.
          </p>
        )}
      </div>
    </section>
  );
}
