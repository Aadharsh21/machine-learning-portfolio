import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ReactNode } from "react";

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** accessible name for the thumb */
  label: string;
  /** what screen readers say for the value, e.g. "40%" */
  valueText: string;
  /** the filled part of the track; any CSS colour */
  color?: string;
  /** draws a hollow thumb, for a reading that has no value yet */
  empty?: boolean;
  disabled?: boolean;
  /** marks drawn on the track, positioned by value (e.g. a recorded value) */
  marks?: { value: number; label: string; node?: ReactNode }[];
}

/** A single-thumb slider built on Radix, with a 44px touch target on phones. */
export function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  valueText,
  color = "var(--ink)",
  empty = false,
  disabled = false,
  marks = [],
}: Props) {
  const clamped = Math.min(max, Math.max(min, value));
  const frac = (v: number) => (Math.min(max, Math.max(min, v)) - min) / (max - min);
  return (
    <div className="relative">
      <SliderPrimitive.Root
        className="relative flex h-11 w-full touch-none items-center select-none data-[disabled]:opacity-50 lg:h-7"
        min={min}
        max={max}
        step={step}
        value={[clamped]}
        disabled={disabled}
        onValueChange={(v) => {
          const next = v[0];
          if (next !== undefined) onChange(next);
        }}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-2">
          {!empty && (
            <SliderPrimitive.Range className="absolute h-full" style={{ background: color }} />
          )}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          aria-valuetext={valueText}
          className={`block h-5 w-5 rounded-full border-2 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            empty ? "border-ink-3 bg-page" : "border-page bg-ink ring-1 ring-ink"
          }`}
        />
      </SliderPrimitive.Root>
      {marks.map((m) => (
        <span
          key={m.label}
          title={m.label}
          aria-hidden
          className="pointer-events-none absolute top-[calc(50%+5px)] h-2 w-0.5 -translate-x-1/2 rounded-full bg-ink-3"
          // Radix keeps the 20px thumb inside the track, so its centre runs from 10px to 100% - 10px
          style={{ left: `calc(10px + (100% - 20px) * ${frac(m.value)})` }}
        >
          {m.node}
        </span>
      ))}
    </div>
  );
}
