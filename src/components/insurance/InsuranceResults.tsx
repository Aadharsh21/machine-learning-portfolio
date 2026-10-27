import { DataTable } from "@/components/site/DataTable";
import type { Engine, InsuranceMeta } from "@/lib/engine";

const ROWS = ["v1_age_only", "linear_all", "lightgbm", "v2_linear_interactions"] as const;

const TERMS: { key: string; label: string; unit: string }[] = [
  { key: "smoker_obese", label: "Smoker with a BMI of 30 or more", unit: "" },
  { key: "smoker_bmi", label: "Smoker, for each BMI point", unit: "" },
  { key: "smoker", label: "Smoker", unit: "" },
  { key: "children", label: "Each child covered", unit: "" },
  { key: "age", label: "Age", unit: " a year" },
  { key: "age_squared", label: "Age squared", unit: " a year²" },
  { key: "bmi", label: "BMI, for each point", unit: "" },
  { key: "obese", label: "BMI of 30 or more", unit: "" },
  { key: "male", label: "Male", unit: "" },
  { key: "region_northwest", label: "Northwest, against the northeast", unit: "" },
  { key: "region_southeast", label: "Southeast, against the northeast", unit: "" },
  { key: "region_southwest", label: "Southwest, against the northeast", unit: "" },
];

/** Dollars with cents when small, e.g. "+$3.63", "−$541". */
function signedDollars(v: number, engine: Engine) {
  if (Math.abs(v) >= 100) return engine.formatSignedUsd(v);
  return `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
}

/** "How the model works": the method, the coefficients in dollars and the cross-validated comparison. */
export function InsuranceResults({ meta, engine }: { meta: InsuranceMeta; engine: Engine }) {
  const models = ROWS.flatMap((key) => {
    const m = meta.models[key];
    return m ? [{ key, label: m.label, cv: m.cv }] : [];
  });
  const v2 = meta.models["v2_linear_interactions"]?.cv;
  const gbm = meta.models["lightgbm"]?.cv;
  const c = meta.coefficients;
  const smokerPerPoint = (c["smoker_bmi"] ?? 0) + (c["bmi"] ?? 0);
  const terms = TERMS.filter((t) => t.key in c);

  return (
    <section aria-labelledby="how-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="how-h" className="font-condensed text-3xl text-ink">
        How the model works
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="space-y-5 font-serif text-lg leading-relaxed text-ink-2 lg:col-span-7">
          <p>
            The data is {engine.formatInt(meta.rows)} US customers: age, sex, BMI, children covered,
            smoking and region, and what their medical care cost the insurer in a year. The average
            is {engine.formatUsd(meta.mean_charges)}, but it hides three groups.
          </p>
          <p>
            <span className="font-sans text-base font-semibold text-ink">
              Interactions instead of more model.
            </span>{" "}
            v2 is still a linear regression, with two terms that switch on for smokers: one for
            every BMI point and one for crossing a BMI of 30. For a smoker each BMI point costs
            about {engine.formatUsd(smokerPerPoint)} and crossing 30 adds{" "}
            {engine.formatUsd((c["smoker_obese"] ?? 0) + (c["obese"] ?? 0))} at once; for a
            non-smoker BMI barely matters.
            {v2 && gbm && (
              <>
                {" "}
                Graded by 5 x 5 repeated cross-validation it beats LightGBM (R²{" "}
                {v2.r2.mean.toFixed(3)} against {gbm.r2.mean.toFixed(3)}, typical error{" "}
                {engine.formatUsd(v2.mae.mean)} against {engine.formatUsd(gbm.mae.mean)}), and every
                number in it reads in dollars.
              </>
            )}
          </p>
          <p>
            <span className="font-sans text-base font-semibold text-ink">
              A range, not just a number.
            </span>{" "}
            Errors are lopsided: about 1 in 12 customers pay far more than any input explains, most
            likely from health conditions the data doesn't record. So the range comes from the
            model's own errors on customers it hadn't seen, kept separately for smokers and
            non-smokers. Aimed at {engine.formatPercent(meta.interval.target)}, it held the real
            charge {engine.formatPercent(meta.interval.coverage)} of the time over{" "}
            {meta.interval.repeats} repeats.
          </p>
          <p>
            <span className="font-sans text-base font-semibold text-ink">Exact explanations.</span>{" "}
            With six inputs there are only 64 ways to combine them, so the Shapley values on this
            page are computed exactly in your browser, averaging over all{" "}
            {engine.formatInt(meta.rows)} customers, rather than estimated.
          </p>
        </div>
        <div className="lg:col-span-5">
          <DataTable
            caption="v2's coefficients, in dollars a year"
            rows={terms}
            rowKey={(t) => t.key}
            columns={[
              { key: "t", header: "Term", render: (t) => t.label },
              {
                key: "v",
                header: "Adds",
                numeric: true,
                render: (t) => `${signedDollars(c[t.key] ?? 0, engine)}${t.unit}`,
              },
            ]}
          />
          <p className="mt-3 text-sm text-ink-2">
            Age enters twice, so charges climb faster as people get older.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <DataTable
          caption="Graded by 5 x 5 repeated cross-validation (mean ± standard deviation)"
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
              header: "Root mean square error",
              numeric: true,
              render: (m) => engine.formatUsd(m.cv.rmse.mean),
            },
          ]}
        />
        <p className="mt-4 max-w-3xl text-sm text-ink-2">
          Typical error is the mean absolute error: how far off the estimate is for an average
          customer. The root mean square error weighs big misses more, which is why it stays high
          for every model.
        </p>
      </div>
    </section>
  );
}
