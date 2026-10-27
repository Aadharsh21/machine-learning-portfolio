import type { ReactNode } from "react";

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
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="mb-3 caption-top text-left font-semibold text-ink">{caption}</caption>
        <thead>
          <tr className="border-b border-rule-strong">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-3 py-2 font-medium whitespace-nowrap text-ink-2 ${c.numeric ? "text-right" : "text-left"}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className={`border-b border-rule ${highlight?.(r) ? "bg-surface font-medium" : ""}`}>
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 text-ink ${c.numeric ? "tabular text-right whitespace-nowrap" : "text-left"}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
