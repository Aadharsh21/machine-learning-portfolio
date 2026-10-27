import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { RangeSlider } from "@/components/site/RangeSlider";
import { Segmented } from "@/components/site/Segmented";
import { Waterfall } from "@/components/site/Waterfall";
import { kUsd, niceTicks } from "@/lib/axis";
import type { Engine, InsuranceCalculator, InsuranceQuote, Profile } from "@/lib/engine";

interface Props {
  calc: InsuranceCalculator;
  engine: Engine;
  profile: Profile;
  quote: InsuranceQuote;
  onProfile: (p: Profile) => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Field({
  label,
  value,
  children,
  hint,
}: {
  label: string;
  value?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <p className="flex justify-between text-sm text-ink-2">
        <span>{label}</span>
        {value && <span className="tabular font-semibold text-ink">{value}</span>}
      </p>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** Where the expected charge and the middle-80% range sit on a dollar scale. */
function RangeBar({ engine, quote }: { engine: Engine; quote: InsuranceQuote }) {
  const { lo, median, hi } = quote.range;
  const max = Math.max(65000, hi * 1.05);
  const pos = (v: number) => `${(Math.max(0, Math.min(max, v)) / max) * 100}%`;
  const ticks = niceTicks(0, max, 4);
  return (
    <div className="mt-6" aria-hidden>
      <div className="relative h-8">
        {ticks.map((t) => (
          <span key={t} className="absolute inset-y-0 w-px bg-rule" style={{ left: pos(t) }} />
        ))}
        <span
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[2px] bg-insurance opacity-40"
          style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }}
        />
        <span
          className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-ink-2"
          style={{ left: pos(median) }}
          title="Typical charge"
        />
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-page bg-ink"
          style={{ left: pos(quote.charges) }}
        />
      </div>
      <div className="relative mt-1 h-4 text-xs text-ink-3">
        {ticks.map((t, i) => (
          <span
            key={t}
            className={`tabular absolute top-0 ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: pos(t) }}
          >
            {kUsd(t)}
          </span>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-page bg-ink ring-1 ring-ink" />
          Expected
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-0.5 bg-ink-2" />
          Typical (median)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-[2px] bg-insurance opacity-40" />8 in 10 similar
          customers {engine.formatUsd(lo)}–{engine.formatUsd(hi)}
        </li>
      </ul>
    </div>
  );
}

/** One-change comparisons: what the model expects if a single input were different. */
function whatIfs(calc: InsuranceCalculator, p: Profile) {
  const obese = calc.model.json.obese_bmi;
  const out: { label: string; profile: Profile }[] = [];
  if (p.smoker) out.push({ label: "If you didn't smoke", profile: { ...p, smoker: 0 } });
  if (p.smoker && p.bmi >= obese)
    out.push({ label: `With a BMI just under ${obese}`, profile: { ...p, bmi: obese - 0.1 } });
  if (p.smoker && p.bmi < obese)
    out.push({ label: `With a BMI of ${obese}`, profile: { ...p, bmi: obese } });
  if (!p.smoker) out.push({ label: "If you smoked", profile: { ...p, smoker: 1 } });
  if (p.age <= 54) out.push({ label: "Ten years older", profile: { ...p, age: p.age + 10 } });
  if (p.children < 5)
    out.push({ label: "One more child", profile: { ...p, children: p.children + 1 } });
  return out.map((w) => ({ ...w, charges: calc.model.predict(w.profile) }));
}

export function Calculator({ calc, engine, profile: p, quote: q, onProfile }: Props) {
  const set = (patch: Partial<Profile>) => onProfile({ ...p, ...patch });
  const obese = calc.model.json.obese_bmi;

  // running total from the average customer through each input, largest effect first
  let run = q.base;
  const rows = q.contributions.map((c) => {
    const from = run;
    run += c.value;
    return {
      label: c.label,
      detail: c.text,
      from,
      to: run,
      delta: engine.formatSignedUsd(c.value),
    };
  });
  const values = [q.base, ...rows.map((r) => r.to)];
  const lo = Math.min(0, ...values);
  const hi = Math.max(...values) * 1.08;
  const ticks = niceTicks(lo, hi, 4).map((v) => ({ value: v, label: kUsd(v) }));
  const others = whatIfs(calc, p);

  return (
    <section id="calculator" aria-labelledby="calc-h" className="border-t border-rule pt-10">
      <h2 id="calc-h" className="font-condensed text-3xl text-ink">
        Get a quote
      </h2>
      <p className="mt-2 max-w-3xl text-ink-2">
        Describe a customer and the model estimates their yearly medical charges, how much they
        could vary, and which inputs pushed the estimate up or down.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <form
          className="space-y-6 lg:col-span-4"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Customer"
        >
          <Field label="Age" value={`${p.age}`}>
            <RangeSlider
              value={p.age}
              min={18}
              max={64}
              step={1}
              color="var(--insurance)"
              label="Age"
              valueText={`${p.age} years`}
              onChange={(age) => set({ age })}
            />
          </Field>
          <Field
            label="BMI"
            value={p.bmi.toFixed(1)}
            hint={`Weight in kg divided by height in metres squared. ${obese} or more counts as obese.`}
          >
            <RangeSlider
              value={p.bmi}
              min={16}
              max={53}
              step={0.1}
              color="var(--insurance)"
              label="Body mass index"
              valueText={p.bmi.toFixed(1)}
              onChange={(bmi) => set({ bmi: Math.round(bmi * 10) / 10 })}
              marks={[{ value: obese, label: `BMI ${obese}` }]}
            />
          </Field>
          <Field label="Smoker">
            <Segmented
              label="Smoker"
              value={p.smoker ? "yes" : "no"}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              onChange={(v) => set({ smoker: v === "yes" ? 1 : 0 })}
            />
          </Field>
          <Field label="Children covered">
            <Segmented
              label="Children covered"
              value={String(p.children)}
              options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(v) => set({ children: Number(v) })}
            />
          </Field>
          <Field label="Sex">
            <Segmented
              label="Sex"
              value={p.male ? "male" : "female"}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
              onChange={(v) => set({ male: v === "male" ? 1 : 0 })}
            />
          </Field>
          <Field label="Region (US)">
            <select
              aria-label="Region"
              value={p.region}
              onChange={(e) => set({ region: Number(e.currentTarget.value) })}
              className="h-11 w-full rounded-sm border border-rule-strong bg-page px-3 text-sm text-ink sm:h-9"
            >
              {calc.regions.map((r, i) => (
                <option key={r} value={i}>
                  {capitalize(r)}
                </option>
              ))}
            </select>
          </Field>
        </form>

        <div className="min-w-0 space-y-8 lg:col-span-8">
          <section
            aria-labelledby="quote-h"
            aria-live="polite"
            className="rounded-lg border border-rule p-5 sm:p-6"
          >
            <h3 id="quote-h" className="sr-only">
              Quote
            </h3>
            <p className="font-condensed tabular text-6xl leading-none text-ink sm:text-7xl">
              {engine.formatUsd(q.charges)}
            </p>
            <p className="mt-2 text-sm text-ink-2">expected medical charges a year</p>
            <p className="mt-4 font-serif text-lg leading-snug text-ink">
              8 in 10 customers like this pay between {engine.formatUsd(q.range.lo)} and{" "}
              {engine.formatUsd(q.range.hi)}; the typical one pays{" "}
              {engine.formatUsd(q.range.median)}.
              {q.charges > q.range.hi
                ? " The expected charge is higher than most of them pay: a few customers like this pay far more than the rest, which pulls the average up."
                : q.charges - q.range.median > 0.25 * (q.range.hi - q.range.lo)
                  ? " The expected charge sits above the typical one because a few customers pay far more than the rest."
                  : ""}
            </p>
            <RangeBar engine={engine} quote={q} />
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1 text-sm text-ink">
              {calc.groupLabels[q.group]}: average{" "}
              {engine.formatUsd(calc.meta.group_means[q.group])}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0">
              <h3 className="font-condensed text-2xl text-ink">Why this amount</h3>
              <p className="mt-1 mb-4 text-sm text-ink-2">
                From the average customer's {engine.formatUsd(q.base)}, each input's exact Shapley
                value, largest first.
              </p>
              <Waterfall
                start={{ label: "Average customer", value: q.base, text: engine.formatUsd(q.base) }}
                end={{
                  label: "This customer",
                  value: q.charges,
                  text: engine.formatUsd(q.charges),
                }}
                rows={rows}
                domain={[lo, hi]}
                ticks={ticks}
                upColor="var(--neg)"
                downColor="var(--pos)"
                legend={{ up: "Adds to charges", down: "Takes off" }}
                caption={`From the average customer's ${engine.formatUsd(q.base)} to ${engine.formatUsd(
                  q.charges,
                )}. ${q.contributions
                  .map((c) => `${c.label} (${c.text}) ${engine.formatSignedUsd(c.value)}`)
                  .join(", ")}.`}
              />
            </div>
            <div>
              <h3 className="font-condensed text-2xl text-ink">Change one thing</h3>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {others.map((w) => {
                  const d = w.charges - q.charges;
                  return (
                    <li key={w.label}>
                      <button
                        type="button"
                        onClick={() => onProfile(w.profile)}
                        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-2.5 text-left text-sm hover:bg-surface"
                      >
                        <span className="text-ink">{w.label}</span>
                        <span className="tabular text-right text-ink">
                          {engine.formatUsd(w.charges)}
                          <span
                            className={`ml-2 inline-block text-xs ${d < 0 ? "text-good" : "text-ink-3"}`}
                          >
                            {engine.formatSignedUsd(d)}
                          </span>
                          <ArrowRight
                            className="ml-1 inline h-3.5 w-3.5 text-ink-3 group-hover:text-ink"
                            aria-hidden
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-ink-3">Click a row to apply it.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
