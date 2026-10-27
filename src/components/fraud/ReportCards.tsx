import type { Engine, FraudMeta } from "@/lib/engine";

interface Figure {
  value: string;
  label: string;
  tone?: "good" | "critical";
}

function Card({ title, figures, line }: { title: string; figures: Figure[]; line: string }) {
  return (
    <li className="flex flex-col rounded-lg border border-rule p-5">
      <h3 className="font-condensed text-xl leading-tight text-ink">{title}</h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        {figures.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-xs text-ink-3">{f.label}</dt>
            <dd
              className={`font-condensed tabular mt-0.5 text-2xl leading-tight ${
                f.tone === "good"
                  ? "text-good"
                  : f.tone === "critical"
                    ? "text-critical"
                    : "text-ink"
              }`}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-5 font-serif text-lg leading-snug text-ink-2">{line}</p>
    </li>
  );
}

/** v1 graded on a balanced sample, the same v1 on the real stream, and v2 on the real stream. */
export function ReportCards({ meta, engine }: { meta: FraudMeta; engine: Engine }) {
  const balanced = meta.v1_balanced_view;
  const v1 = meta.models["v1_undersampled_logistic"]?.test;
  const v2 = meta.models["v2_lightgbm"]?.test;
  if (!v1 || !v2) return null;
  const pct = (v: number) => engine.formatPercent(v, 1);
  const review = engine.formatUsd(meta.review_cost);
  const legit = meta.splits.test.rows - meta.splits.test.frauds;

  const stream = (t: typeof v1): Figure[] => [
    { value: pct(t.precision), label: "Precision (alerts that are fraud)" },
    { value: `${t.tp} of ${t.tp + t.fn}`, label: "Frauds caught" },
    {
      value: engine.formatInt(t.fp),
      label: `False alarms (${engine.formatInt(Math.round(t.alerts_per_hour))} alerts an hour)`,
    },
    {
      value: engine.formatSignedUsd(t.net_savings),
      label: `Net at ${review} per review`,
      tone: t.net_savings >= 0 ? "good" : "critical",
    },
  ];

  return (
    <section aria-labelledby="cards-h" className="border-t border-rule pt-10">
      <h2 id="cards-h" className="font-condensed text-3xl text-ink">
        Two report cards
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card
          title="v1, graded the way it graded itself"
          figures={[
            { value: pct(balanced.accuracy), label: "Accuracy" },
            { value: pct(balanced.precision), label: "Precision (alerts that are fraud)" },
            { value: `${balanced.tp} of ${balanced.tp + balanced.fn}`, label: "Frauds caught" },
            {
              value: `${balanced.fp} of ${balanced.fp + balanced.tn}`,
              label: "False alarms, of legitimate payments",
            },
          ]}
          line="On a balanced 50/50 sample, v1 looks excellent."
        />
        <Card
          title="The same v1 on the real stream"
          figures={stream(v1)}
          line={`On the real ${meta.test_hours.toFixed(1)} hours, only 2 in 100 alerts are fraud.`}
        />
        <Card
          title="v2 on the real stream"
          figures={stream(v2)}
          line="9 in 10 alerts are fraud, and a false alarm comes about once an hour."
        />
      </ul>
      <p className="mt-4 max-w-3xl text-sm text-ink-2">
        Same {meta.splits.test.frauds} frauds each time. The balanced sample keeps only{" "}
        {balanced.fp + balanced.tn} of the {engine.formatInt(legit)} legitimate payments, so almost
        all of v1's false alarms never show up.
      </p>
    </section>
  );
}
