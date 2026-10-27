import { ArrowRight, Info, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { RangeSlider } from "@/components/site/RangeSlider";
import { Segmented } from "@/components/site/Segmented";
import { Waterfall } from "@/components/site/Waterfall";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { kUsd, niceTicks } from "@/lib/axis";
import type { Engine, InsuranceCalculator, InsuranceQuote, Profile } from "@/lib/engine";

interface Props {
  calc: InsuranceCalculator;
  engine: Engine;
  profile: Profile;
  quote: InsuranceQuote;
  onProfile: (p: Profile) => void;
}

/** The BMI at which the model's obesity terms switch on. */
const OBESE = 30;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const stepBtn =
  "inline-flex h-11 w-11 items-center justify-center rounded-sm border border-rule-strong text-ink hover:bg-surface disabled:opacity-40 sm:h-9 sm:w-9";

function Field({
  label,
  id,
  value,
  children,
}: {
  label: string;
  id: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="flex justify-between text-sm text-ink-2">
        <span id={id}>{label}</span>
        {value !== undefined && <span className="tabular font-semibold text-ink">{value}</span>}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Where 8 in 10 similar customers land, the typical charge and the average, on a dollar scale. */
function RangeBar({ engine, quote }: { engine: Engine; quote: InsuranceQuote }) {
  const { lo, median, hi } = quote.range;
  const max = Math.max(65000, hi * 1.05, quote.charges * 1.05);
  const pos = (v: number) => `${(Math.max(0, Math.min(max, v)) / max) * 100}%`;
  const ticks = niceTicks(0, max, 4);
  return (
    <div className="mt-5" aria-hidden>
      <div className="relative h-8">
        {ticks.map((t) => (
          <span key={t} className="absolute inset-y-0 w-px bg-rule" style={{ left: pos(t) }} />
        ))}
        <span
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[2px] bg-insurance opacity-45"
          style={{ left: pos(lo), width: `max(3px, calc(${pos(hi)} - ${pos(lo)}))` }}
        />
        <span
          className="absolute top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-ink"
          style={{ left: pos(median) }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-page bg-ink-2"
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
          <span className="h-4 w-[3px] rounded-[1px] bg-ink" />
          Typical
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-[2px] bg-insurance opacity-45" />8 in 10 like this
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rotate-45 bg-ink-2" />
          Average
        </li>
      </ul>
    </div>
  );
}

/** Single changes to the profile and the typical charge each would give. */
function oneChanges(calc: InsuranceCalculator, p: Profile) {
  const out: { label: string; profile: Profile }[] = [];
  if (p.smoker) out.push({ label: "If they didn't smoke", profile: { ...p, smoker: 0 } });
  else out.push({ label: "If they smoked", profile: { ...p, smoker: 1 } });
  if (p.smoker && p.bmi >= OBESE)
    out.push({ label: `With a BMI just under ${OBESE}`, profile: { ...p, bmi: OBESE - 0.1 } });
  if (p.smoker && p.bmi < OBESE)
    out.push({ label: `With a BMI of ${OBESE}`, profile: { ...p, bmi: OBESE } });
  if (p.age <= 54) out.push({ label: "Ten years older", profile: { ...p, age: p.age + 10 } });
  if (p.children < 5)
    out.push({ label: "One more child", profile: { ...p, children: p.children + 1 } });
  return out.map((w) => ({
    ...w,
    typical: calc.byAge(w.profile, w.profile.age, w.profile.age)[0]?.median ?? 0,
  }));
}

export function Calculator({ calc, engine, profile: p, quote: q, onProfile }: Props) {
  const set = (patch: Partial<Profile>) => onProfile({ ...p, ...patch });

  // running total from the average customer through each input, largest effect first
  let run = q.base;
  const rows = q.contributions.map((c) => {
    const from = run;
    run += c.value;
    return {
      label: `${c.label}: ${c.text}`,
      from,
      to: run,
      delta: engine.formatSignedUsd(c.value),
    };
  });
  const hi = Math.max(q.base, ...rows.map((r) => Math.max(r.from, r.to))) * 1.08;
  const ticks = niceTicks(0, hi, 4).map((v) => ({ value: v, label: kUsd(v) }));
  const changes = oneChanges(calc, p);

  return (
    <section
      id="calculator"
      aria-labelledby="calc-h"
      className="scroll-mt-6 border-t border-rule pt-10"
    >
      <h2 id="calc-h" className="font-condensed text-3xl text-ink">
        Describe a customer
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <form
          className="space-y-6 lg:col-span-4"
          onSubmit={(e) => e.preventDefault()}
          aria-labelledby="calc-h"
        >
          <Field label="Age" id="age-l" value={`${p.age}`}>
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
          <Field label="Sex" id="sex-l">
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
          <Field label="BMI" id="bmi-l" value={p.bmi.toFixed(1)}>
            <RangeSlider
              value={p.bmi}
              min={15}
              max={55}
              step={0.1}
              color="var(--insurance)"
              label="BMI"
              valueText={p.bmi.toFixed(1)}
              onChange={(bmi) => set({ bmi: Math.round(bmi * 10) / 10 })}
              marks={[{ value: OBESE, label: `${OBESE}: obese` }]}
            />
            <p
              className="relative h-4 text-xs text-ink-3"
              style={{ marginLeft: `calc(10px + (100% - 20px) * ${(OBESE - 15) / 40})` }}
              aria-hidden
            >
              <span className="absolute -translate-x-1/2 whitespace-nowrap">{OBESE}: obese</span>
            </p>
          </Field>
          <Field label="Children" id="children-l">
            <div className="flex items-center gap-3" role="group" aria-labelledby="children-l">
              <button
                type="button"
                className={stepBtn}
                onClick={() => set({ children: p.children - 1 })}
                disabled={p.children <= 0}
                aria-label="One fewer child"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span
                className="tabular w-6 text-center text-lg font-semibold text-ink"
                aria-live="polite"
              >
                {p.children}
              </span>
              <button
                type="button"
                className={stepBtn}
                onClick={() => set({ children: p.children + 1 })}
                disabled={p.children >= 5}
                aria-label="One more child"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </Field>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="smoker" className="text-sm text-ink-2">
              Smoker
            </label>
            <Switch
              id="smoker"
              checked={p.smoker === 1}
              onCheckedChange={(on) => set({ smoker: on ? 1 : 0 })}
            />
          </div>
          <Field label="Region" id="region-l">
            <Select value={String(p.region)} onValueChange={(v) => set({ region: Number(v) })}>
              <SelectTrigger aria-labelledby="region-l" className="h-11 border-rule-strong sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calc.regions.map((r, i) => (
                  <SelectItem key={r} value={String(i)}>
                    {capitalize(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>

        <div className="min-w-0 space-y-10 lg:col-span-8">
          <section
            aria-labelledby="quote-h"
            aria-live="polite"
            className="rounded-lg border border-rule p-5 sm:p-6"
          >
            <h3 id="quote-h" className="text-sm text-ink-2">
              Typical yearly charges
            </h3>
            <p className="font-condensed tabular mt-1 text-6xl leading-none text-ink sm:text-7xl">
              {engine.formatUsd(q.range.median)}
            </p>
            <p className="mt-4 text-ink">
              8 in 10 people like this pay between{" "}
              <span className="tabular font-semibold">{engine.formatUsd(q.range.lo)}</span> and{" "}
              <span className="tabular font-semibold">{engine.formatUsd(q.range.hi)}</span>
            </p>
            <RangeBar engine={engine} quote={q} />
            <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
              Average, including rare large bills:{" "}
              <span className="tabular font-semibold text-ink">{engine.formatUsd(q.charges)}</span>
              <Popover>
                <PopoverTrigger
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface hover:text-ink"
                  aria-label="Why the average is higher than the typical charge"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </PopoverTrigger>
                <PopoverContent className="w-72 border-rule-strong bg-page text-sm text-ink">
                  The errors are lopsided. About 1 in 12 customers pay far more than any model
                  predicts, most likely because of health conditions the data doesn't record. Those
                  bills pull the average above the typical one.
                </PopoverContent>
              </Popover>
            </p>
            <p className="mt-4 inline-flex flex-wrap items-center gap-x-2 rounded-full border border-rule px-3 py-1 text-sm text-ink">
              <span className="font-medium">{calc.groupLabels[q.group]}</span>
              <span className="text-ink-2">
                average {engine.formatUsd(calc.meta.group_means[q.group])}
              </span>
            </p>
          </section>

          <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="min-w-0">
              <h3 className="font-condensed text-2xl text-ink">Why this amount</h3>
              <div className="mt-4">
                <Waterfall
                  start={{
                    label: "Average customer",
                    value: q.base,
                    text: engine.formatUsd(q.base),
                  }}
                  end={{
                    label: "Expected charges",
                    value: q.charges,
                    text: engine.formatUsd(q.charges),
                  }}
                  rows={rows}
                  domain={[0, hi]}
                  ticks={ticks}
                  upColor="var(--series-2)"
                  downColor="var(--series-1)"
                  legend={{ up: "Adds to the bill", down: "Takes off the bill" }}
                  caption={`From the average customer's ${engine.formatUsd(q.base)} to expected charges of ${engine.formatUsd(
                    q.charges,
                  )}. ${q.contributions
                    .map((c) => `${c.label} (${c.text}) ${engine.formatSignedUsd(c.value)}`)
                    .join(", ")}.`}
                />
              </div>
              <p className="mt-4 text-sm text-ink-2">
                Exact Shapley values against the average customer. With only six inputs, every
                combination can be computed.
              </p>
            </div>
            <div>
              <h3 className="font-condensed text-2xl text-ink">Change one thing</h3>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {changes.map((w) => {
                  const d = w.typical - q.range.median;
                  return (
                    <li key={w.label}>
                      <button
                        type="button"
                        onClick={() => onProfile(w.profile)}
                        className="group grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-2.5 text-left text-sm hover:bg-surface"
                      >
                        <span className="text-ink">{w.label}</span>
                        <span className="tabular text-right text-ink">
                          {engine.formatUsd(w.typical)}
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
              <p className="mt-2 text-xs text-ink-3">
                Typical yearly charges. Click a row to apply it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
