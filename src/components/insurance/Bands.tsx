import { useMemo, useState } from "react";
import { Legend } from "@/components/site/Legend";
import { useElementWidth } from "@/hooks/useElementWidth";
import { kUsd, niceTicks } from "@/lib/axis";
import type { Engine, InsuranceCalculator, InsuranceGroup, Profile } from "@/lib/engine";

interface Props {
  calc: InsuranceCalculator;
  engine: Engine;
  profile: Profile;
  /** loads a customer into the calculator */
  onProfile: (p: Profile) => void;
}

const GROUPS: InsuranceGroup[] = ["non_smoker", "smoker_bmi_under_30", "smoker_bmi_30_plus"];
const COLOR: Record<InsuranceGroup, string> = {
  non_smoker: "var(--series-1)",
  smoker_bmi_under_30: "var(--series-4)",
  smoker_bmi_30_plus: "var(--series-8)",
};
const PAD = { left: 56, top: 16, bottom: 44 };
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Charges against age for all customers, coloured by band, with the current profile's typical charge. */
export function Bands({ calc, engine, profile, onProfile }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const narrow = width < 640;
  const h = narrow ? 340 : 440;
  // wide charts label each band in the right margin; narrow ones rely on the legend
  const right = narrow ? 16 : 176;
  const pw = Math.max(1, width - PAD.left - right);
  const ph = h - PAD.top - PAD.bottom;
  const maxY = 65000;
  const x = (age: number) => PAD.left + ((age - 17) / (65 - 17)) * pw;
  const y = (v: number) => PAD.top + (1 - Math.min(maxY, Math.max(0, v)) / maxY) * ph;

  const line = useMemo(() => calc.byAge(profile), [calc, profile]);
  const band = useMemo(() => {
    const up = line.map((r) => `${x(r.age).toFixed(1)},${y(r.hi).toFixed(1)}`);
    const down = [...line].reverse().map((r) => `${x(r.age).toFixed(1)},${y(r.lo).toFixed(1)}`);
    return `M${up.join("L")}L${down.join("L")}Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, width]);
  // the profile's typical (median) charge at every age
  const path = line
    .map((r, i) => `${i ? "L" : "M"}${x(r.age).toFixed(1)},${y(r.median).toFixed(1)}`)
    .join("");

  // where to put each band's direct label: its average among the oldest customers
  const labels = useMemo(
    () =>
      GROUPS.map((g) => {
        const old = calc.customers.filter((c) => c.group === g && c.profile.age >= 58);
        const mean = old.reduce((s, c) => s + c.charges, 0) / Math.max(1, old.length);
        return { group: g, mean };
      }),
    [calc],
  );

  const pick = (mx: number, my: number) => {
    let best: number | null = null;
    let bestD = 14 * 14;
    calc.customers.forEach((c, i) => {
      const dx = x(c.profile.age) - mx;
      const dy = y(c.charges) - my;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const hc = hover === null ? undefined : calc.customers[hover];
  const you = line.find((r) => r.age === profile.age)?.median ?? 0;

  return (
    <section aria-labelledby="bands-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="bands-h" className="font-condensed text-3xl text-ink">
        Three bands, not two
      </h2>

      <figure className="m-0 mt-6">
        <Legend
          items={[
            ...GROUPS.map((g) => ({
              label: `${calc.groupLabels[g]}, average ${engine.formatUsd(calc.meta.group_means[g])}`,
              color: COLOR[g],
            })),
            {
              label: "This customer's typical charge at each age",
              color: "var(--ink)",
              shape: "line" as const,
            },
          ]}
        />
        <div ref={ref} className="relative mt-3">
          {width > 0 && (
            <svg
              width={width}
              height={h}
              className="block"
              role="img"
              aria-label={`Yearly charges against age for all ${engine.formatInt(
                calc.customers.length,
              )} customers. Charges rise with age in three parallel bands: non-smokers lowest, smokers with a BMI under 30 in the middle, smokers with a BMI of 30 or more highest. The line shows the typical charge for the customer in the calculator at every age, with the range where 8 in 10 such customers land.`}
              onMouseLeave={() => setHover(null)}
            >
              {niceTicks(0, maxY, 6).map((v) => (
                <g key={v}>
                  <line x1={PAD.left} x2={PAD.left + pw} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
                  <text
                    x={PAD.left - 8}
                    y={y(v) + 4}
                    textAnchor="end"
                    fontSize={12}
                    fill="var(--ink-3)"
                  >
                    {kUsd(v)}
                  </text>
                </g>
              ))}
              {[20, 30, 40, 50, 60].map((a) => (
                <text
                  key={a}
                  x={x(a)}
                  y={PAD.top + ph + 18}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--ink-3)"
                >
                  {a}
                </text>
              ))}
              <text
                x={PAD.left + pw / 2}
                y={h - 6}
                textAnchor="middle"
                fontSize={13}
                fill="var(--ink-2)"
              >
                Age
              </text>
              <path d={band} fill="var(--ink)" opacity={0.08} />
              {calc.customers.map((c, i) => (
                <circle
                  key={i}
                  cx={x(c.profile.age)}
                  cy={y(c.charges)}
                  r={hover === i ? 5 : 3}
                  fill={COLOR[c.group]}
                  stroke="var(--page)"
                  strokeWidth={hover === i ? 2 : 0.75}
                  opacity={hover === null || hover === i ? 0.85 : 0.6}
                />
              ))}
              <path d={path} fill="none" stroke="var(--ink)" strokeWidth={2} />
              <circle
                cx={x(profile.age)}
                cy={y(you)}
                r={6}
                fill="var(--page)"
                stroke="var(--ink)"
                strokeWidth={2.5}
              />
              {!narrow &&
                labels.map((l) => (
                  <g key={l.group}>
                    <circle cx={PAD.left + pw + 14} cy={y(l.mean)} r={4} fill={COLOR[l.group]} />
                    <text
                      x={PAD.left + pw + 24}
                      y={y(l.mean) + 4}
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--ink-2)"
                    >
                      {calc.groupLabels[l.group]}
                    </text>
                  </g>
                ))}
              <rect
                x={PAD.left}
                y={PAD.top}
                width={pw}
                height={ph}
                fill="transparent"
                style={{ cursor: hover !== null ? "pointer" : "default" }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHover(pick(e.clientX - r.left + PAD.left, e.clientY - r.top + PAD.top));
                }}
                onClick={() => {
                  if (hc) {
                    onProfile(hc.profile);
                    document.getElementById("calculator")?.scrollIntoView({ block: "start" });
                  }
                }}
              />
            </svg>
          )}
          {hc && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm text-ink shadow-sm"
              style={{
                left: x(hc.profile.age),
                top: y(hc.charges),
                transform: `translate(${x(hc.profile.age) > width / 2 ? "calc(-100% - 12px)" : "12px"}, ${
                  y(hc.charges) > h / 2 ? "calc(-100% - 4px)" : "4px"
                })`,
              }}
            >
              <p className="tabular font-semibold">{engine.formatUsd(hc.charges)} a year</p>
              <p className="mt-0.5 text-ink-2">
                {hc.profile.age}, {hc.profile.male ? "male" : "female"}, BMI{" "}
                {hc.profile.bmi.toFixed(1)}, {hc.profile.smoker ? "smoker" : "non-smoker"},{" "}
                {hc.profile.children} {hc.profile.children === 1 ? "child" : "children"},{" "}
                {capitalize(calc.regions[hc.profile.region] ?? "")}
              </p>
              <p className="mt-1 text-xs text-ink-3">Click to load into the calculator</p>
            </div>
          )}
        </div>
        <figcaption className="mt-3 max-w-3xl text-sm text-ink-2">
          v1 drew one line for smokers and one for everyone else. The data has three bands: smokers
          with a BMI of 30 or more pay about twice as much as other smokers.
        </figcaption>
        <p className="mt-2 max-w-3xl text-xs text-ink-3">
          Each dot is a customer; hover for details and click to load them into the calculator. The
          line and shaded band are the calculator's customer at every age.
        </p>
      </figure>
    </section>
  );
}
