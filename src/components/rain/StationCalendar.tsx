import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Engine, RainExplorer, Scheme } from "@/lib/engine";
import { formatDay, formatMonth } from "@/lib/dates";

interface Props {
  rain: RainExplorer;
  engine: Engine;
  scheme: Scheme;
  station: string;
  stationName: string;
  /** the day open in the explorer (past mode), outlined */
  selectedDay: number | null;
  onOpenDay: (day: number) => void;
}

const CELL = 11;
const PITCH = CELL + 2;
const LEFT = 30;
const TOP = 20;
const ROWS = ["Mon", "", "Wed", "", "Fri", "", ""];

/** Whether a chanceColor() is dark enough to need a white dot on it. */
function isDark(color: string): boolean {
  const m = color.match(/\d+/g);
  if (!m || m.length < 3) return false;
  const [r, g, b] = m.map(Number) as [number, number, number];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55;
}

/** Every test day at one station: weeks as columns, Monday to Sunday as rows. */
export function StationCalendar({
  rain,
  engine,
  scheme,
  station,
  stationName,
  selectedDay,
  onOpenDay,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState<number>(selectedDay ?? rain.lastDay);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    if (selectedDay !== null) setCursor(selectedDay);
  }, [selectedDay]);

  const history = useMemo(() => rain.history(station), [rain, station]);
  const byDay = useMemo(() => new Map(history.map((h) => [h.day, h])), [history]);
  const offset = useMemo(() => (rain.dateOf(0).getUTCDay() + 6) % 7, [rain]);
  const weeks = Math.floor((rain.lastDay + offset) / 7) + 1;
  const width = LEFT + weeks * PITCH;
  const height = TOP + 7 * PITCH;
  const at = (day: number): [number, number] => {
    const k = day + offset;
    return [LEFT + Math.floor(k / 7) * PITCH, TOP + (k % 7) * PITCH];
  };

  const months = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    for (let d = 0; d <= rain.lastDay; d++) {
      const date = rain.dateOf(d);
      if (date.getUTCDate() !== 1 && d !== 0) continue;
      const x = LEFT + Math.floor((d + offset) / 7) * PITCH;
      const label =
        date.getUTCMonth() === 0 || d === 0
          ? `${formatMonth(date)} ${date.getUTCFullYear()}`
          : formatMonth(date);
      out.push({ x: d === 0 ? x : x + (date.getUTCDay() === 1 ? 0 : PITCH), label });
    }
    return out;
  }, [rain, offset]);

  const cells = useMemo(() => {
    const out = [];
    for (let d = 0; d <= rain.lastDay; d++) {
      const k = d + offset;
      const x = LEFT + Math.floor(k / 7) * PITCH;
      const y = TOP + (k % 7) * PITCH;
      const h = byDay.get(d);
      if (!h) {
        out.push(
          <rect
            key={d}
            x={x + 0.5}
            y={y + 0.5}
            width={CELL - 1}
            height={CELL - 1}
            rx={2}
            fill="none"
            stroke="var(--rule)"
          />,
        );
        continue;
      }
      const fill = engine.chanceColor(h.probability, scheme);
      out.push(
        <g key={d}>
          <rect x={x} y={y} width={CELL} height={CELL} rx={2} fill={fill} />
          {h.actual === 1 && (
            <circle
              cx={x + CELL / 2}
              cy={y + CELL / 2}
              r={1.9}
              fill={isDark(fill) ? "#ffffff" : "var(--ink)"}
            />
          )}
        </g>,
      );
    }
    return out;
  }, [rain, offset, byDay, engine, scheme]);

  const describe = (day: number) => {
    const h = byDay.get(day);
    const date = formatDay(rain.dateOf(day));
    if (!h) return `${date}: no readings`;
    return `${date}: ${engine.formatChance(h.probability)} chance of rain, ${h.actual ? "it rained the next day" : "dry the next day"}`;
  };

  const dayAt = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - r.left - LEFT) / PITCH);
    const row = Math.floor((e.clientY - r.top - TOP) / PITCH);
    if (col < 0 || row < 0 || row > 6) return null;
    const d = col * 7 + row - offset;
    return d >= 0 && d <= rain.lastDay ? d : null;
  };

  const keepVisible = (day: number) => {
    const el = scroller.current;
    if (!el) return;
    const [x] = at(day);
    if (x < el.scrollLeft + LEFT) el.scrollLeft = x - LEFT;
    else if (x + CELL > el.scrollLeft + el.clientWidth)
      el.scrollLeft = x + CELL - el.clientWidth + 8;
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: 7,
      ArrowLeft: -7,
      ArrowDown: 1,
      ArrowUp: -1,
    };
    let next: number | null = null;
    const move = moves[e.key];
    if (move !== undefined) next = Math.min(rain.lastDay, Math.max(0, cursor + move));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = rain.lastDay;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenDay(cursor);
      return;
    } else return;
    e.preventDefault();
    setCursor(next);
    setAnnounce(describe(next));
    keepVisible(next);
  };

  const stats = rain.stationStats(station);
  const tipDay = hover ?? (focused ? cursor : null);
  const tip = tipDay === null ? null : byDay.get(tipDay);
  const [tipX, tipY] = tipDay === null ? [0, 0] : at(tipDay);
  const selected = selectedDay !== null ? at(selectedDay) : null;
  const cursorAt = focused ? at(cursor) : null;

  return (
    <section aria-labelledby="calendar-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="calendar-h" className="font-condensed text-3xl text-ink">
        {stationName}, day by day
      </h2>
      {stats && (
        <p className="mt-2 max-w-3xl text-ink-2">
          Forecast right on{" "}
          <span className="tabular font-semibold text-ink">
            {engine.formatPercent(stats.accuracy)}
          </span>{" "}
          of <span className="tabular">{engine.formatInt(stats.days)}</span> days in 2016-17. Rain
          fell on <span className="tabular">{engine.formatPercent(stats.rain_rate)}</span> of them.
        </p>
      )}

      <div className="relative mt-6">
        <div
          ref={scroller}
          className="overflow-x-auto rounded-sm pb-2"
          tabIndex={0}
          role="group"
          aria-roledescription="calendar"
          aria-label={`${stationName}, day by day: the forecast chance of rain for each test day. Arrow keys move between days, Enter opens a day in the explorer.`}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block"
            aria-hidden
            style={{ cursor: hover !== null ? "pointer" : "default" }}
            onMouseMove={(e) => setHover(dayAt(e))}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => {
              const d = dayAt(e);
              if (d !== null) {
                setCursor(d);
                onOpenDay(d);
              }
            }}
          >
            {months.map((m) => (
              <text key={`${m.x}-${m.label}`} x={m.x} y={12} fontSize={11} fill="var(--ink-3)">
                {m.label}
              </text>
            ))}
            {ROWS.map(
              (label, row) =>
                label && (
                  <text
                    key={label}
                    x={0}
                    y={TOP + row * PITCH + 9}
                    fontSize={10}
                    fill="var(--ink-3)"
                  >
                    {label}
                  </text>
                ),
            )}
            {cells}
            {selected && (
              <rect
                x={selected[0] - 1.5}
                y={selected[1] - 1.5}
                width={CELL + 3}
                height={CELL + 3}
                rx={3}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={2}
              />
            )}
            {cursorAt && (
              <rect
                x={cursorAt[0] - 2.5}
                y={cursorAt[1] - 2.5}
                width={CELL + 5}
                height={CELL + 5}
                rx={3.5}
                fill="none"
                stroke="var(--focus)"
                strokeWidth={2}
              />
            )}
          </svg>
        </div>
        {tipDay !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm shadow-sm"
            style={{
              left: Math.max(0, tipX - scrollLeft + CELL / 2),
              top: tipY,
              transform: `translate(${tipX - scrollLeft > width * 0.6 ? "-100%" : "-50%"}, calc(-100% - 8px))`,
            }}
          >
            <p className="font-semibold text-ink">{formatDay(rain.dateOf(tipDay))}</p>
            {tip ? (
              <>
                <p className="tabular text-ink-2">
                  {engine.formatChance(tip.probability)} chance of rain
                </p>
                <p className="text-ink-2">
                  {tip.actual ? "It rained the next day" : "Dry the next day"}
                </p>
              </>
            ) : (
              <p className="text-ink-2">No readings</p>
            )}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3">0%</span>
          <span
            className="h-2.5 w-32 rounded-sm"
            style={{ background: engine.chanceGradient(scheme) }}
            aria-hidden
          />
          <span className="text-xs text-ink-3">100%</span>
          <span className="ml-1">Forecast chance of rain</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden>
            <rect
              x="1"
              y="1"
              width={CELL}
              height={CELL}
              rx="2"
              fill={engine.chanceColor(0.15, scheme)}
            />
            <circle cx="6.5" cy="6.5" r="1.9" fill="var(--ink)" />
          </svg>
          Rained the next day
        </div>
        <span className="text-ink-3">Click a day to open it</span>
      </div>
    </section>
  );
}
