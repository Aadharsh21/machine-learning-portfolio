/** Round tick steps (1, 2 or 5 x 10^n) covering [lo, hi]. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

/** "$5k", "−$10k", "$0" for axis ticks. */
export const kUsd = (v: number) =>
  v === 0 ? "$0" : `${v < 0 ? "−" : ""}$${+(Math.abs(v) / 1000).toPrecision(3)}k`;
