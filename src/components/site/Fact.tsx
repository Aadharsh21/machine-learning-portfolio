export function Fact({ value, from, label }: { value: string; from?: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-condensed tabular text-4xl leading-none text-ink">{value}</span>
        {from && <span className="tabular text-sm text-ink-3">from {from}</span>}
      </div>
      <div className="mt-2 text-sm text-ink-2">{label}</div>
    </div>
  );
}
