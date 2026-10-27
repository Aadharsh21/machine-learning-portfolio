import { DataTable } from "@/components/site/DataTable";
import type { Engine, InsuranceMeta } from "@/lib/engine";

const ROWS = ["v1_age_only", "linear_all", "lightgbm", "v2_linear_interactions"] as const;

/** v2's terms, in the order and words the page uses. */
const TERMS: { key: string; label: string }[] = [
  { key: "age", label: "Each year of age" },
  { key: "age_squared", label: "Each year of age, squared (charges rise faster with age)" },
  { key: "bmi", label: "Each BMI point" },
  { key: "children", label: "Each child" },
  { key: "smoker", label: "Smoking, before the BMI terms" },
  { key: "male", label: "Male" },
  { key: "region_northwest", label: "Northwest, compared with the Northeast" },
  { key: "region_southeast", label: "Southeast, compared with the Northeast" },
  { key: "region_southwest", label: "Southwest, compared with the Northeast" },
  { key: "obese", label: "BMI of 30 or more" },
  { key: "smoker_obese", label: "Smoker with a BMI of 30 or more" },
  { key: "smoker_bmi", label: "Each BMI point, for smokers" },
];

/** Dollars with a sign, and cents when the value is under $10 in size: "+$3.63", "−$541". */
function signedDollars(v: number, engine: Engine) {
  if (Math.abs(v) >= 10) return engine.formatSignedUsd(v);
  return `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
}

/** "Interactions instead of more model" and "How honest is the range?". */
export function InsuranceResults({ meta, engine }: { meta: InsuranceMeta; engine: Engine }) {
  const models = ROWS.flatMap((key) => {
    const m = meta.models[key];
    return m ? [{ key, label: m.label, cv: m.cv }] : [];
  });
  const v2 = meta.models["v2_linear_interactions"]?.cv;
  const gbm = meta.models["lightgbm"]?.cv;
  const terms = TERMS.filter((t) => t.key in meta.coefficients);
  const { interval } = meta;

  return (
    <>
      <section aria-labelledby="interactions-h" className="mt-16 border-t border-rule pt-10">
        <h2 id="interactions-h" className="font-condensed text-3xl text-ink">
          Interactions instead of more model
        </h2>
        {v2 && gbm && (
          <p className="mt-4 max-w-3xl font-serif text-lg leading-relaxed text-ink-2">
            A linear regression with smoker × obesity and smoker × BMI terms beats LightGBM under 5
            × 5 repeated cross-validation (R² {v2.r2.mean.toFixed(3)} vs {gbm.r2.mean.toFixed(3)},
            typical error {engine.formatUsd(v2.mae.mean)} vs {engine.formatUsd(gbm.mae.mean)}), and
            every coefficient still reads in dollars.
          </p>
        )}
        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <DataTable
              caption="Graded by 5 × 5 repeated cross-validation (mean ± standard deviation)"
              rows={models}
              rowKey={(m) => m.key}
              highlight={(m) => m.key === "v2_linear_interactions"}
              columns={[
                { key: "model", header: "Model", render: (m) => m.label },
                {
                  key: "r2",
                  header: "R²",
                  numeric: true,
                  render: (m) => `${m.cv.r2.mean.toFixed(3)} ± ${m.cv.r2.std.toFixed(3)}`,
                },
                {
                  key: "mae",
                  header: "Typical error",
                  numeric: true,
                  render: (m) =>
                    `${engine.formatUsd(m.cv.mae.mean)} ± ${engine.formatUsd(m.cv.mae.std)}`,
                },
                {
                  key: "rmse",
                  header: "RMSE",
                  numeric: true,
                  render: (m) => engine.formatUsd(m.cv.rmse.mean),
                },
              ]}
            />
            <p className="mt-3 text-sm text-ink-2">
              Typical error is the mean absolute error. RMSE, the root mean square error, weighs big
              misses more.
            </p>
          </div>
          <div className="lg:col-span-5">
            <h3 className="font-semibold text-ink">v2's coefficients, in dollars a year</h3>
            <dl className="mt-3 divide-y divide-rule border-y border-rule text-sm">
              {terms.map((t) => (
                <div key={t.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-2">
                  <dt className="text-ink-2">{t.label}</dt>
                  <dd className="tabular text-right font-medium text-ink">
                    {signedDollars(meta.coefficients[t.key] ?? 0, engine)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="honest-h" className="mt-16 border-t border-rule pt-10">
        <h2 id="honest-h" className="font-condensed text-3xl text-ink">
          How honest is the range?
        </h2>
        <p className="mt-4 max-w-3xl font-serif text-lg leading-relaxed text-ink-2">
          On customers the model hadn't seen, the 8-in-10 range contained the real charge{" "}
          {engine.formatPercent(interval.coverage)} of the time across {interval.repeats} repeats
          (the target is {engine.formatPercent(interval.target)}). On average it is{" "}
          {engine.formatUsd(interval.mean_width)} wide.
        </p>
      </section>
    </>
  );
}
