export interface LegendItem {
  label: string;
  color: string; // any CSS colour, e.g. "var(--series-1)"
  shape?: "dot" | "square" | "line" | "dash";
}

export function Legend({ items, className = "" }: { items: LegendItem[]; className?: string }) {
  return (
    <ul
      className={`flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2 ${className}`}
      aria-label="Legend"
    >
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2">
          <svg width="16" height="12" aria-hidden>
            {it.shape === "line" || it.shape === "dash" ? (
              <line
                x1="0"
                x2="16"
                y1="6"
                y2="6"
                stroke={it.color}
                strokeWidth="2"
                strokeDasharray={it.shape === "dash" ? "4 3" : undefined}
              />
            ) : it.shape === "square" ? (
              <rect x="2" y="1" width="10" height="10" fill={it.color} />
            ) : (
              <circle cx="7" cy="6" r="5" fill={it.color} />
            )}
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}
