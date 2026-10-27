import { useId, type ReactNode } from "react";

export interface Column<R> {
  key: string;
  header: ReactNode;
  numeric?: boolean;
  render: (row: R) => ReactNode;
}

interface Props<R> {
  caption: ReactNode;
  columns: Column<R>[];
  rows: R[];
  rowKey: (row: R, i: number) => string;
  highlight?: (row: R) => boolean;
}

export function DataTable<R>({ caption, columns, rows, rowKey, highlight }: Props<R>) {
  const id = useId();
  // the caption sits outside the scrolling box so it wraps to the screen, not the table
  return (
    <div>
      <p id={id} className="mb-3 text-sm font-semibold text-ink">
        {caption}
      </p>
      <div className="overflow-x-auto">
        <table aria-labelledby={id} className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-3 py-2 font-medium whitespace-nowrap text-ink-2 ${c.numeric ? "text-right" : "text-left"}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={rowKey(r, i)}
                className={`border-b border-rule ${highlight?.(r) ? "bg-surface font-medium" : ""}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 text-ink ${c.numeric ? "tabular text-right whitespace-nowrap" : "min-w-36 text-left"}`}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
