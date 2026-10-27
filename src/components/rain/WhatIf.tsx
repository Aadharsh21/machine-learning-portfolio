import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { RangeSlider } from "@/components/site/RangeSlider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  Engine,
  NumericField,
  RainEdits,
  RainForecast,
  ReadingSpec,
  WindField,
} from "@/lib/engine";

interface Props {
  engine: Engine;
  compass: string[];
  forecast: RainForecast | null;
  edits: RainEdits;
  onEdits: (edits: RainEdits) => void;
  /** live mode: readings that are still forecasts because those hours haven't happened */
  forecastFields: string[];
}

const hasEdits = (e: RainEdits) =>
  Object.keys(e.numeric ?? {}).length > 0 || Object.keys(e.wind ?? {}).length > 0;

function Badge() {
  return (
    <span className="ml-1.5 inline-block rounded-sm border border-rule-strong px-1 align-[1px] text-[11px] leading-4 text-ink-3">
      forecast
    </span>
  );
}

function ReadingRow({
  spec,
  forecast: f,
  edited,
  isForecast,
  onChange,
}: {
  spec: ReadingSpec;
  forecast: RainForecast;
  edited: boolean;
  isForecast: boolean;
  onChange: (v: number) => void;
}) {
  const value = f.observation.numeric[spec.field];
  const recorded = f.recorded.numeric[spec.field];
  const missing = Number.isNaN(value);
  const text = (v: number) =>
    Number.isNaN(v) ? "not recorded" : `${v.toFixed(spec.digits)}${spec.unit}`;
  return (
    <div
      className={`rounded-md border px-3 pt-2.5 pb-1.5 ${edited ? "border-rule-strong bg-surface" : "border-transparent"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">
          {spec.label}
          {isForecast && <Badge />}
        </span>
        <span className={`tabular text-sm font-medium ${missing ? "text-ink-3" : "text-ink"}`}>
          {text(value)}
        </span>
      </div>
      <RangeSlider
        value={missing ? (spec.min + spec.max) / 2 : value}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        empty={missing}
        color="var(--rain)"
        label={spec.label}
        valueText={text(value)}
        onChange={onChange}
        marks={
          edited && !Number.isNaN(recorded)
            ? [{ value: recorded, label: `Recorded: ${text(recorded)}` }]
            : []
        }
      />
      <p className="h-4 text-xs text-ink-3">{edited ? `Recorded: ${text(recorded)}` : ""}</p>
    </div>
  );
}

function WindRow({
  field,
  label,
  compass,
  forecast: f,
  edited,
  isForecast,
  onChange,
}: {
  field: WindField;
  label: string;
  compass: string[];
  forecast: RainForecast;
  edited: boolean;
  isForecast: boolean;
  onChange: (v: number | null) => void;
}) {
  const value = f.observation.wind[field];
  const recorded = f.recorded.wind[field];
  const id = `wind-${field}`;
  return (
    <div
      className={`rounded-md border px-3 pt-2.5 pb-1.5 ${edited ? "border-rule-strong bg-surface" : "border-transparent"}`}
    >
      <span id={id} className="text-sm text-ink">
        {label}
        {isForecast && <Badge />}
      </span>
      <Select
        value={value === null ? "none" : String(value)}
        onValueChange={(v) => onChange(v === "none" ? null : Number(v))}
      >
        <SelectTrigger aria-labelledby={id} className="mt-1.5 h-11 border-rule-strong sm:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not recorded</SelectItem>
          {compass.map((c, i) => (
            <SelectItem key={c} value={String(i)}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 h-4 text-xs text-ink-3">
        {edited ? `Recorded: ${recorded === null ? "not recorded" : compass[recorded]}` : ""}
      </p>
    </div>
  );
}

/** Sliders for every reading: change one and the forecast above updates. */
export function WhatIf({ engine, compass, forecast: f, edits, onEdits, forecastFields }: Props) {
  const [showAll, setShowAll] = useState(false);
  const primary = engine.RAIN_READINGS.filter((r) => r.primary);
  const others = engine.RAIN_READINGS.filter((r) => !r.primary);
  const total = engine.RAIN_READINGS.length + engine.RAIN_WINDS.length;

  const setNumeric = (field: NumericField, v: number) =>
    onEdits({ ...edits, numeric: { ...edits.numeric, [field]: v } });
  const setWind = (field: WindField, v: number | null) =>
    onEdits({ ...edits, wind: { ...edits.wind, [field]: v } });
  const isEdited = (field: string) =>
    (edits.numeric !== undefined && field in edits.numeric) ||
    (edits.wind !== undefined && field in edits.wind);

  const row = (spec: ReadingSpec) =>
    f && (
      <ReadingRow
        key={spec.field}
        spec={spec}
        forecast={f}
        edited={isEdited(spec.field)}
        isForecast={forecastFields.includes(spec.field)}
        onChange={(v) => setNumeric(spec.field, v)}
      />
    );

  return (
    <section aria-labelledby="whatif-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="whatif-h" className="font-condensed text-3xl text-ink">
        What if the readings were different?
      </h2>
      <p className="mt-2 max-w-2xl text-ink-2">
        Drag any reading and the forecast above updates instantly. Grey ticks mark the recorded
        value.
      </p>
      {!f ? (
        <p className="mt-6 text-ink-2">There are no readings to change for this station and day.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              onClick={() => onEdits({})}
              disabled={!hasEdits(edits)}
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 sm:h-9"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset to recorded
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <Switch checked={showAll} onCheckedChange={setShowAll} />
              Show all {total} readings
            </label>
            <p className="text-sm text-ink-2">
              Rained today: {f.observation.rainToday ? "yes" : "no"} (more than 1 mm by 9am)
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {primary.map(row)}
            {showAll && others.map(row)}
            {showAll &&
              engine.RAIN_WINDS.map((w) => (
                <WindRow
                  key={w.field}
                  field={w.field}
                  label={w.label}
                  compass={compass}
                  forecast={f}
                  edited={isEdited(w.field)}
                  isForecast={forecastFields.includes(w.field)}
                  onChange={(v) => setWind(w.field, v)}
                />
              ))}
          </div>
        </>
      )}
    </section>
  );
}
