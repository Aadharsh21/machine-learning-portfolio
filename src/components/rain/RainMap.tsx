import { CloudRain, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Engine, RainDayView, RainMap as MapLayout, Scheme } from "@/lib/engine";

interface Props {
  map: MapLayout;
  view: RainDayView;
  selected: string;
  /** past days show rings where it rained and the outcome in tooltips */
  past: boolean;
  scheme: Scheme;
  engine: Engine;
  onSelect: (id: string) => void;
  /** what the map shows, for screen readers */
  label: string;
}

const R = 7.5;
const R_SELECTED = 9;

/** Australia with one dot per station, coloured by the forecast chance of rain. */
export function RainMap({ map, view, selected, past, scheme, engine, onSelect, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(map.width);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // SVG units per CSS pixel: text and hit areas grow on small screens so they stay usable
  const unit = map.width / Math.max(1, width);
  const fontSize = 12 * Math.min(Math.max(unit, 1), 1.9);
  const reach = Math.max(24, 22 * unit);
  const showCities = width >= 480;

  const byId = useMemo(() => new Map(view.stations.map((s) => [s.station.id, s])), [view]);
  const order = useMemo(() => {
    const ids = view.stations
      .map((s) => s.station.id)
      .filter((id) => id !== hover && id !== selected);
    if (hover && hover !== selected) ids.push(hover);
    ids.push(selected);
    return ids.filter((id) => byId.has(id) && map.points[id]);
  }, [view, hover, selected, byId, map]);

  const toSvg = (e: ReactMouseEvent<SVGSVGElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * map.width) / r.width,
      ((e.clientY - r.top) * map.height) / r.height,
    ];
  };
  const stationAt = (e: ReactMouseEvent<SVGSVGElement>) => {
    const [x, y] = toSvg(e);
    return map.stationAt(x, y, reach);
  };

  const labels = showCities ? [...new Set([...map.labelled, selected])] : [selected];
  const tip = hover ? byId.get(hover) : undefined;
  const tipPoint = hover ? map.points[hover] : undefined;

  return (
    <div ref={wrap} className="relative">
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="block h-auto w-full touch-manipulation select-none"
        style={{ cursor: hover ? "pointer" : "default" }}
        role="img"
        aria-label={label}
        onPointerMove={(e) => e.pointerType === "mouse" && setHover(stationAt(e))}
        onPointerDown={(e) => e.pointerType !== "mouse" && setHover(stationAt(e))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        onClick={(e) => {
          const id = stationAt(e);
          if (id) {
            onSelect(id);
            setHover(id);
          } else setHover(null);
        }}
      >
        <path
          d={map.land}
          fill="var(--land)"
          stroke="var(--rule-strong)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <g>
          <rect
            x={map.inset.x}
            y={map.inset.y}
            width={map.inset.width}
            height={map.inset.height}
            rx={6}
            fill="var(--page)"
            stroke="var(--rule-strong)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={map.inset.land}
            fill="var(--land)"
            stroke="var(--rule-strong)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={map.inset.x + map.inset.width / 2}
            y={map.inset.y + map.inset.height + Math.min(fontSize * 0.9, 14) * 1.3}
            textAnchor="middle"
            fontSize={Math.min(fontSize * 0.9, 14)}
            fill="var(--ink-3)"
          >
            {map.inset.label}
          </text>
        </g>

        {order.map((id) => {
          const s = byId.get(id)!;
          const [x, y] = map.points[id]!;
          const isSelected = id === selected;
          const r = isSelected ? R_SELECTED : R;
          return (
            <g key={id}>
              {isSelected && <circle cx={x} cy={y} r={18} fill="var(--rain)" fillOpacity={0.2} />}
              {past && s.actual === 1 && (
                <circle
                  cx={x}
                  cy={y}
                  r={r + 3.5}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {s.probability === null ? (
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="var(--page)"
                  stroke="var(--ink-3)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={engine.chanceColor(s.probability, scheme)}
                  stroke={isSelected ? "var(--ink)" : "var(--page)"}
                  strokeWidth={isSelected ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })}

        {labels.map((id) => {
          const s = byId.get(id);
          const point = map.points[id];
          if (!s || !point) return null;
          const isSelected = id === selected;
          const at = map.labelFor(id, isSelected ? R_SELECTED : R);
          // labelFor is laid out for 12px text: keep larger text centred on its dot
          const grow = fontSize - 12;
          const y =
            at.anchor === "middle"
              ? at.y > point[1]
                ? at.y + grow * 0.8
                : at.y
              : at.y + grow * 0.35;
          return (
            <text
              key={`label-${id}`}
              x={at.x}
              y={y}
              textAnchor={at.anchor}
              fontSize={fontSize}
              fontWeight={isSelected ? 600 : 400}
              fill={isSelected ? "var(--ink)" : "var(--ink-2)"}
              stroke="var(--page)"
              strokeWidth={3 * Math.min(Math.max(unit, 1), 1.9)}
              strokeLinejoin="round"
              paintOrder="stroke"
              pointerEvents="none"
            >
              {s.station.name}
            </text>
          );
        })}
      </svg>

      {tip && tipPoint && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 w-max max-w-[14rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm shadow-sm"
          style={{
            left: `${(tipPoint[0] / map.width) * 100}%`,
            top: `${(tipPoint[1] / map.height) * 100}%`,
            // above the dot, or below it near the top edge so it never covers the toolbar
            transform: `translate(${tipPoint[0] < map.width * 0.2 ? "-12%" : tipPoint[0] > map.width * 0.75 ? "-88%" : "-50%"}, ${
              tipPoint[1] < map.height * 0.3 ? "16px" : "calc(-100% - 16px)"
            })`,
          }}
        >
          <p className="font-semibold text-ink">{tip.station.name}</p>
          <p className="tabular text-ink-2">
            {tip.probability === null
              ? "No readings"
              : `${engine.formatChance(tip.probability)} chance of rain`}
          </p>
          {past && tip.actual !== null && (
            <p className="mt-0.5 flex items-center gap-1.5 text-ink-2">
              {tip.actual ? (
                <CloudRain className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Sun className="h-3.5 w-3.5" aria-hidden />
              )}
              {tip.actual ? "It rained" : "It stayed dry"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
