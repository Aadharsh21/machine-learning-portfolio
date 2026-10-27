import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Waterfall } from "@/components/site/Waterfall";
import type { Engine, FraudExplanation, FraudLab, FraudPolicy } from "@/lib/engine";
import { KindIcon } from "./KindIcon";
import { fraudKind, KIND_LABEL } from "./kinds";

type Explained =
  | { index: number; status: "loading" }
  | { index: number; status: "ready"; data: FraudExplanation }
  | { index: number; status: "missing" }
  | { index: number; status: "error"; message: string };

const TICKS = [
  { value: 0, label: "0%" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "100%" },
];

/** Why v2 scored one payment the way it did: a waterfall of its inputs' SHAP values. */
export function WhyFlagged({
  lab,
  engine,
  policy,
  index,
}: {
  lab: FraudLab;
  engine: Engine;
  policy: FraudPolicy;
  index: number | null;
}) {
  const [explained, setExplained] = useState<Explained | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (index === null) return;
    if (!lab.canExplain(index)) {
      setExplained({ index, status: "missing" });
      return;
    }
    let alive = true;
    setExplained({ index, status: "loading" });
    lab.explain(index).then(
      (data) => {
        if (!alive) return;
        setModelLoaded(true);
        setExplained(data ? { index, status: "ready", data } : { index, status: "missing" });
      },
      (e) => {
        if (alive)
          setExplained({
            index,
            status: "error",
            message: e instanceof Error ? e.message : String(e),
          });
      },
    );
    return () => {
      alive = false;
    };
  }, [lab, index]);

  return (
    <section
      aria-labelledby="why-h"
      aria-live="polite"
      className="rounded-lg border border-rule p-5 sm:p-6"
    >
      <h3 id="why-h" className="font-condensed text-2xl text-ink">
        Why it was flagged
      </h3>
      {index === null ? (
        <p className="mt-3 text-sm text-ink-2">Pick a payment on the radar or in the feed.</p>
      ) : (
        <>
          <Header lab={lab} engine={engine} policy={policy} index={index} />
          <div className="mt-5">
            {explained?.index !== index || explained.status === "loading" ? (
              <p className="text-sm text-ink-2" role="status">
                {modelLoaded ? "Working out the reasons…" : "Loading the model…"}
              </p>
            ) : explained.status === "missing" ? (
              <p className="text-sm text-ink-2">
                This payment's inputs aren't in the exported sample.
              </p>
            ) : explained.status === "error" ? (
              <p className="text-sm text-critical">Couldn't load the model: {explained.message}</p>
            ) : (
              <Waterfall
                start={{
                  label: "Typical payment",
                  value: explained.data.waterfall.start,
                  text: engine.formatChance(explained.data.waterfall.start),
                }}
                end={{
                  label: "v2's score",
                  value: explained.data.waterfall.end,
                  text: engine.formatChance(explained.data.waterfall.end),
                }}
                rows={explained.data.waterfall.steps.map((s) => ({
                  label: s.label,
                  from: s.from,
                  to: s.to,
                  delta: engine.formatPoints(s.to - s.from),
                }))}
                domain={[0, 1]}
                ticks={TICKS}
                upColor="var(--series-8)"
                downColor="var(--series-1)"
                legend={{ up: "Pushes toward fraud", down: "Pushes toward legitimate" }}
                caption={`How v2 scored this payment: a typical payment scores ${engine.formatChance(
                  explained.data.waterfall.start,
                )}; this one's inputs take it to ${engine.formatChance(explained.data.waterfall.end)}.`}
              />
            )}
            {explained?.index === index && explained.status === "ready" && (
              <AllInputs contributions={explained.data.contributions} />
            )}
          </div>
          <p className="mt-5 text-xs text-ink-3">
            V1 to V28 are anonymised: the bank released them as principal components of the original
            card data, so they have numbers instead of names. Reasons are always the v2 model's.
          </p>
        </>
      )}
    </section>
  );
}

/** Every input's push in log-odds, the model's own scale, largest first. */
function AllInputs({ contributions }: { contributions: { label: string; value: number }[] }) {
  const [open, setOpen] = useState(false);
  const most = Math.max(...contributions.map((c) => Math.abs(c.value)), 1e-9);
  const fmt = (v: number) => `${v >= 0 ? "+" : "\u2212"}${Math.abs(v).toFixed(2)}`;
  return (
    <div className="mt-5 border-t border-rule pt-4">
      <p className="text-xs text-ink-3">
        Rows are ordered by their push on the model's log-odds scale. Near 0% even a big push barely
        moves the chance, so the first rows can show +0 pts.
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="all-inputs"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-ink underline-offset-4 hover:underline lg:h-8"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        {open ? "Hide" : "Show"} all {contributions.length} inputs
      </button>
      {open && (
        <ol id="all-inputs" className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {contributions.map((c) => (
            <li
              key={c.label}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.25rem] items-center gap-2 text-sm"
            >
              <span className="text-ink">{c.label}</span>
              <span className="relative h-2.5" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-rule-strong" />
                <span
                  className="absolute inset-y-0 rounded-[2px]"
                  style={{
                    left: c.value >= 0 ? "50%" : `${50 - (Math.abs(c.value) / most) * 50}%`,
                    width: `max(1px, ${(Math.abs(c.value) / most) * 50}%)`,
                    background: c.value >= 0 ? "var(--series-8)" : "var(--series-1)",
                  }}
                />
              </span>
              <span className="tabular text-right text-ink-2">{fmt(c.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Header({
  lab,
  engine,
  policy,
  index,
}: {
  lab: FraudLab;
  engine: Engine;
  policy: FraudPolicy;
  index: number;
}) {
  const flags = lab.flags(policy);
  const kind = fraudKind(lab.stream.isFraud[index] === 1, flags[index] === 1);
  const fraud = lab.stream.isFraud[index] === 1;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {fraud || flags[index] ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <KindIcon kind={kind} />
          {KIND_LABEL[kind]}
        </span>
      ) : (
        <span className="font-semibold text-ink">Legitimate, not flagged</span>
      )}
      <span className="tabular text-ink-2">Hour {(lab.hourOf[index] ?? 0).toFixed(2)}</span>
      <span className="tabular text-ink-2">{engine.formatUsd(lab.stream.amount[index] ?? 0)}</span>
      <span className="tabular text-ink-2">
        {policy.model}: {engine.formatChance(lab.probability[policy.model][index] ?? 0)} chance of
        fraud
      </span>
    </div>
  );
}
