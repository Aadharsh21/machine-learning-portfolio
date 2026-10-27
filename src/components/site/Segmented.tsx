import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Props<V extends string> {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}

export function Segmented<V extends string>({ label, value, options, onChange }: Props<V>) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as V)}
      className="inline-flex rounded-sm border border-rule-strong p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-8 rounded-sm px-3 text-sm text-ink-2 data-[state=on]:bg-ink data-[state=on]:text-page"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
