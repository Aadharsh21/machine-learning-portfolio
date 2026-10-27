import { Bell, BellOff, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Waterfall } from "@/components/site/Waterfall";
import type { Engine, FraudExplanation, FraudLab, FraudPolicy } from "@/lib/engine";
import { KIND_LABEL, KindIcon, fraudKind } from "./kinds";

interface Props {
  lab: FraudLab;
  engine: Engine;
  policy: FraudPolicy;
  flags: Uint8Array;
  index: number;
}

type Loaded =
  | { status: "loading"; index: number }
  | { status: "ready"; index: number; data: FraudExplanation | null }
  | { status: "error"; index: number; message: string };

const Z = 9.21; // log-odds of 99.99%
const logit = (p: number) => Math.max(-Z, Math.min(Z, Math.log(p / (1 - p))));
const TICKS = [0.0001, 0.01, 0.5, 0.99, 0.9999].map((p) => ({
  value: logit(p),
  label: `${+(p * 100).toPrecision(4)}%`,
}));

/** How a SHAP value (in log-odds) changes the odds of fraud: "×12", "÷3.4". */
function oddsChange(value: number): string {
  const m = Math.exp(Math.abs(value));
  const text =
    m < 10 ? m.toFixed(1) : m < 1000 ? Math.round(m).toString() : `${Math.round(m / 1000)}k`;
  return `${value >= 0 ? "×" : "÷"}${text}`;
}

const chip = "inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 text-sm";

/** Why v2 scored one payment the way it did, and what the current alert rule does with it. */
export function Explanation({ lab, engine, policy, flags, index }: Props) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading", index });

  useEffect(() => {
    let alive = true;
    setLoaded({ status: "loading", index });
    lab.explain(index).then(
      (data) => alive && setLoaded({ status: "ready", index, data }),
      (e) =>
        alive &&
        setLoaded({ status: "error", index, message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [lab, index]);

  const fraud = lab.stream.isFraud[index] === 1;
  const flagged = flags[index] === 1;
  const amount = lab.stream.amount[index] ?? 0;
  const hour = lab.hourOf[index] ?? 0;
  const v1 = lab.probability.v1[index] ?? 0;
  const v2 = lab.probability.v2[index] ?? 0;
  const kind = fraud || flagged ? fraudKind(fraud, flagged) : null;
  const current = loaded.index === index ? loaded : { status: "loading" as const, index };

  return (
    <section
      aria-labelledby="why-h"
      aria-live="polite"
      className="rounded-lg border border-rule p-5 sm:p-6"
    >
      <h3 id="why-h" className="font-condensed text-2xl text-ink">
        Why this score?
      </h3>
      <p className="tabular text-sm text-ink-2">
        Payment of {engine.formatUsd(amount)} at hour {hour.toFixed(2)}
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="font-condensed tabular text-6xl leading-none text-ink">
            {engine.formatChance(v2)}
          </p>
          <p className="mt-2 text-sm text-ink-2">v2's chance this payment is fraud</p>
        </div>
        <div>
          <p className="font-condensed tabular text-3xl leading-none text-ink-2">
            {engine.formatChance(v1)}
          </p>
          <p className="mt-2 text-sm text-ink-2">v1's chance</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        <li className={`${chip} text-ink`}>{fraud ? "It was fraud" : "It was legitimate"}</li>
        <li className={`${chip} text-ink`}>
          {flagged ? (
            <Bell className="h-4 w-4" aria-hidden />
          ) : (
            <BellOff className="h-4 w-4" aria-hidden />
          )}
          {flagged
            ? `Your ${policy.model} rule raises an alert`
            : `Your ${policy.model} rule lets it through`}
        </li>
        <li className={`${chip} font-medium text-ink`}>
          {kind ? (
            <KindIcon kind={kind} />
          ) : (
            <ShieldCheck className="h-4 w-4 text-good" aria-hidden />
          )}
          {kind ? KIND_LABEL[kind] : "Correctly let through"}
        </li>
      </ul>

      <div className="mt-6">
        {current.status === "loading" ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-sm bg-surface motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : current.status === "error" ? (
          <p className="text-sm text-ink-2">Couldn't load the model's reasons: {current.message}</p>
        ) : !current.data ? (
          <p className="text-sm text-ink-2">
            The model's inputs were kept for every fraud, every payment v2 scores at 1% or more and
            a sample of the rest. This payment isn't among them, so its reasons can't be shown. Pick
            a fraud, an alert, or one of the brighter dots.
          </p>
        ) : (
          <>
            <Waterfall
              start={{
                label: "Typical payment",
                value: logit(current.data.waterfall.start),
                text: engine.formatChance(current.data.waterfall.start),
              }}
              end={{
                label: "v2's score",
                value: logit(current.data.waterfall.end),
                text: engine.formatChance(current.data.waterfall.end),
              }}
              rows={current.data.waterfall.steps.map((s) => ({
                label: s.label,
                detail: s.label === "Amount" ? engine.formatUsd(amount) : null,
                from: logit(s.from),
                to: logit(s.to),
                delta: oddsChange(s.value),
              }))}
              domain={[-Z, Z]}
              ticks={TICKS}
              upColor="var(--neg)"
              downColor="var(--pos)"
              legend={{ up: "Pushes toward fraud", down: "Pushes toward legitimate" }}
              caption={`From a typical payment's ${engine.formatChance(
                current.data.waterfall.start,
              )} to v2's ${engine.formatChance(current.data.waterfall.end)}. ${current.data.waterfall.steps
                .map(
                  (s) =>
                    `${s.label} ${s.value >= 0 ? "raises" : "lowers"} the odds ${oddsChange(s.value)}`,
                )
                .join(". ")}.`}
            />
            <p className="mt-4 text-sm text-ink-2">
              On a log-odds scale, so each step multiplies the odds of fraud by the amount on the
              right. V1 to V28 are anonymised summaries of the card data that the bank released
              instead of the raw fields, so their names carry no meaning.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
