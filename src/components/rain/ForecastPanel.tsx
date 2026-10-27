import { Check, CloudRain, Sun, X } from "lucide-react";
import type { ReactNode } from "react";
import { Waterfall } from "@/components/site/Waterfall";
import type { Engine, RainForecast } from "@/lib/engine";

interface Props {
  engine: Engine;
  stationName: string;
  /** "Fri 8 Jul 2016", or "Today, Tue 27 Oct 2026" in live mode */
  dateLabel: string;
  forecast: RainForecast | null;
  /** shown instead of a forecast when there is none */
  empty: ReactNode;
  /** true while the timeline plays, so screen readers wait for it to stop */
  busy: boolean;
  /** extra lines under the waterfall (the live-mode note) */
  footnote?: ReactNode;
}

const TICKS = [
  { value: 0, label: "0%" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "100%" },
];

const chip = "inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 text-sm";

export function ForecastPanel({
  engine,
  stationName,
  dateLabel,
  forecast: f,
  empty,
  busy,
  footnote,
}: Props) {
  return (
    <section
      aria-labelledby="forecast-h"
      aria-live="polite"
      aria-busy={busy}
      className="rounded-lg border border-rule p-5 sm:p-6"
    >
      <h3 id="forecast-h" className="font-condensed text-2xl text-ink">
        {stationName}
      </h3>
      <p className="tabular text-sm text-ink-2">{dateLabel}</p>
      {!f ? (
        <p className="mt-6 text-ink-2">{empty}</p>
      ) : (
        <>
          <p className="font-condensed tabular mt-5 text-6xl leading-none text-ink sm:text-7xl">
            {engine.formatChance(f.probability)}
          </p>
          <p className="mt-2 text-sm text-ink-2">chance of rain (over 1 mm) by 9am the next day</p>
          {f.edited && (
            <p className="mt-3 rounded-md bg-surface px-3 py-2 text-sm text-ink">
              With your changes. The recorded readings give{" "}
              <span className="tabular font-semibold">
                {engine.formatChance(f.recordedProbability)}
              </span>
              .
            </p>
          )}
          {!f.live && f.actual !== null && (
            <ul className="mt-4 flex flex-wrap gap-2">
              <li className={`${chip} text-ink`}>
                {f.actual ? (
                  <CloudRain className="h-4 w-4" aria-hidden />
                ) : (
                  <Sun className="h-4 w-4" aria-hidden />
                )}
                {f.actual ? "It rained the next day" : "It stayed dry"}
              </li>
              {f.correct !== null && (
                <li className={`${chip} font-medium ${f.correct ? "text-good" : "text-critical"}`}>
                  {f.correct ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <X className="h-4 w-4" aria-hidden />
                  )}
                  {f.correct ? "Forecast right" : "Forecast wrong"}
                </li>
              )}
            </ul>
          )}
          <p className="mt-5 font-serif text-lg leading-snug text-ink">{f.sentence}</p>
          <div className="mt-6">
            <Waterfall
              start={{
                label: "Typical day",
                value: f.waterfall.start,
                text: engine.formatChance(f.waterfall.start),
              }}
              end={{
                label: "Forecast",
                value: f.waterfall.end,
                text: engine.formatChance(f.waterfall.end),
              }}
              rows={f.waterfall.steps.map((s) => ({
                label: s.label,
                detail: s.other ? null : f.describe(s.label),
                from: s.from,
                to: s.to,
                delta: engine.formatPoints(s.to - s.from),
              }))}
              domain={[0, 1]}
              ticks={TICKS}
              upColor="var(--pos)"
              downColor="var(--neg)"
              legend={{ up: "Pushes toward rain", down: "Pushes toward dry" }}
              caption={`How the forecast is built: a typical day has a ${engine.formatChance(f.waterfall.start)} chance of rain; this day's readings take it to ${engine.formatChance(f.waterfall.end)}.`}
            />
          </div>
          {footnote}
        </>
      )}
    </section>
  );
}
