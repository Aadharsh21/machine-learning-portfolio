import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useMemo } from "react";
import type { RainExplorer } from "@/lib/engine";
import { formatDay, formatMonth } from "@/lib/dates";

interface Props {
  rain: RainExplorer;
  day: number;
  onDay: (day: number) => void;
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  /** hide Play when the visitor prefers reduced motion */
  canPlay: boolean;
}

const btn =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40 sm:h-9 sm:min-w-9";

/** One thin bar per test day (the share of stations where it rained next day), with a scrubber. */
export function Timeline({ rain, day, onDay, playing, onPlaying, canPlay }: Props) {
  const days = rain.lastDay + 1;
  const bars = useMemo(() => {
    let d = "";
    for (let i = 0; i < days; i++) {
      const h = rain.rainShare[i] ?? 0;
      if (h > 0) d += `M${i + 0.12},1V${(1 - h).toFixed(4)}h0.76V1z`;
    }
    return d;
  }, [rain, days]);
  const quarters = useMemo(() => {
    const out: { day: number; label: string }[] = [];
    for (let i = 0; i < days; i++) {
      const date = rain.dateOf(i);
      if (date.getUTCDate() === 1 && date.getUTCMonth() % 3 === 0) {
        out.push({
          day: i,
          label:
            date.getUTCMonth() === 0
              ? `${formatMonth(date)} ${date.getUTCFullYear()}`
              : formatMonth(date),
        });
      }
    }
    return out;
  }, [rain, days]);

  const share = rain.rainShare[day] ?? 0;
  const at = (d: number) => `calc(8px + (100% - 16px) * ${d / Math.max(1, rain.lastDay)})`;
  const step = (by: number) => {
    onPlaying(false);
    onDay((day + by + days) % days);
  };

  return (
    <div className="mt-6">
      <div className="relative mx-2 h-12" aria-hidden>
        <svg
          viewBox={`0 0 ${days} 1`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <rect x={day} y={0} width={1} height={1} fill="var(--ink)" fillOpacity={0.14} />
          <path d={bars} fill="var(--rain)" fillOpacity={0.55} />
          {share > 0 && (
            <rect x={day + 0.12} y={1 - share} width={0.76} height={share} fill="var(--ink)" />
          )}
        </svg>
        <span
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-ink"
          style={{ left: `${((day + 0.5) / days) * 100}%` }}
        />
      </div>
      <input
        type="range"
        className="range-day mt-1"
        min={0}
        max={rain.lastDay}
        step={1}
        value={day}
        onChange={(e) => {
          onPlaying(false);
          onDay(Number(e.currentTarget.value));
        }}
        aria-label="Day"
        aria-valuetext={formatDay(rain.dateOf(day))}
      />
      <div className="relative h-5 text-xs text-ink-3" aria-hidden>
        {quarters.map((q) => (
          <span
            key={q.day}
            className="tabular absolute top-0 whitespace-nowrap"
            style={{ left: at(q.day) }}
          >
            <span className="absolute -top-1 left-0 h-1.5 w-px bg-rule-strong" />
            <span className="pl-1">{q.label}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => step(-1)} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {canPlay && (
          <button
            type="button"
            className={`${btn} w-24`}
            onClick={() => onPlaying(!playing)}
            aria-pressed={playing}
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {playing ? "Pause" : "Play"}
          </button>
        )}
        <button type="button" className={btn} onClick={() => step(1)} aria-label="Next day">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <span className="tabular ml-1 text-sm font-medium text-ink">
          {formatDay(rain.dateOf(day))}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-3">
        Bars show the share of stations where it rained the next day.
      </p>
    </div>
  );
}
