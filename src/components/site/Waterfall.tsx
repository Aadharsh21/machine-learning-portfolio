import { Legend } from "./Legend";

export interface WaterfallRow {
  label: string;
  /** the input behind the step, shown small under the label */
  detail?: string | null;
  from: number;
  to: number;
  /** the change, written out on the right, e.g. "+12 pts" */
  delta: string;
}

interface Props {
  start: { label: string; value: number; text: string };
  end: { label: string; value: number; text: string };
  rows: WaterfallRow[];
  /** the track's range, e.g. [0, 1] for probabilities */
  domain: [number, number];
  ticks: { value: number; label: string }[];
  /** colours for steps that raise and lower the value */
  upColor: string;
  downColor: string;
  legend: { up: string; down: string };
  /** read out by screen readers in place of the bars */
  caption: string;
}

// Narrow containers stack each row (label and change on one line, the bar under them);
// from 22rem the label, bar and change sit side by side.
const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 @min-[22rem]:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_3.25rem]";
const LABEL = "col-start-1 row-start-1";
const TRACK =
  "relative col-span-2 row-start-2 h-6 @min-[22rem]:col-span-1 @min-[22rem]:col-start-2 @min-[22rem]:row-start-1";
const VALUE = "tabular col-start-2 row-start-1 text-right text-sm @min-[22rem]:col-start-3";

/** A horizontal waterfall: from a starting value through each input's push to the end value. */
export function Waterfall({
  start,
  end,
  rows,
  domain,
  ticks,
  upColor,
  downColor,
  legend,
  caption,
}: Props) {
  const [d0, d1] = domain;
  const pos = (v: number) => `${((Math.min(d1, Math.max(d0, v)) - d0) / (d1 - d0)) * 100}%`;
  const gridlines = (
    <>
      {ticks.map((t) => (
        <span
          key={t.value}
          className="absolute inset-y-0 w-px bg-rule"
          style={{ left: pos(t.value) }}
          aria-hidden
        />
      ))}
    </>
  );

  return (
    <figure className="@container m-0">
      <figcaption className="sr-only">{caption}</figcaption>
      <ol className="space-y-1.5">
        <li className={ROW}>
          <span className={`${LABEL} text-sm text-ink-2`}>{start.label}</span>
          <span className={TRACK} aria-hidden>
            {gridlines}
            <span
              className="absolute inset-y-1 w-0.5 -translate-x-1/2 bg-ink-2"
              style={{ left: pos(start.value) }}
            />
          </span>
          <span className={`${VALUE} text-ink-2`}>{start.text}</span>
        </li>
        {rows.map((r, i) => {
          const lo = Math.min(r.from, r.to);
          const hi = Math.max(r.from, r.to);
          const up = r.to >= r.from;
          return (
            <li key={`${r.label}-${i}`} className={ROW}>
              <span className={`${LABEL} min-w-0 py-0.5 leading-tight`}>
                <span className="text-sm text-ink">{r.label}</span>
                {r.detail && (
                  <span className="block text-xs text-ink-3 @max-[22rem]:ml-2 @max-[22rem]:inline">
                    {r.detail}
                  </span>
                )}
              </span>
              <span className={TRACK} aria-hidden>
                {gridlines}
                <span
                  className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[2px]"
                  style={{
                    left: pos(lo),
                    width: `max(2px, calc(${pos(hi)} - ${pos(lo)}))`,
                    background: up ? upColor : downColor,
                  }}
                />
              </span>
              <span className={`${VALUE} text-ink-2`}>{r.delta}</span>
            </li>
          );
        })}
        <li className={`${ROW} border-t border-rule pt-1.5`}>
          <span className={`${LABEL} text-sm font-semibold text-ink`}>{end.label}</span>
          <span className={TRACK} aria-hidden>
            {gridlines}
            <span
              className="absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-[1px] bg-ink"
              style={{ left: pos(end.value) }}
            />
          </span>
          <span className={`${VALUE} font-semibold text-ink`}>{end.text}</span>
        </li>
      </ol>
      <div className={`${ROW} mt-1`} aria-hidden>
        <span className={`${TRACK} h-4 text-xs text-ink-3`}>
          {ticks.map((t, i) => (
            <span
              key={t.value}
              className={`tabular absolute top-0 whitespace-nowrap ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left: pos(t.value) }}
            >
              {t.label}
            </span>
          ))}
        </span>
      </div>
      <Legend
        className="mt-4"
        items={[
          { label: legend.up, color: upColor, shape: "square" },
          { label: legend.down, color: downColor, shape: "square" },
        ]}
      />
    </figure>
  );
}
