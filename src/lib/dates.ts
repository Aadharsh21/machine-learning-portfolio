const DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** A UTC-midnight date as "Fri 8 Jul 2016". */
export function formatDay(date: Date): string {
  const p: Record<string, string> = {};
  for (const part of DAY.formatToParts(date)) p[part.type] = part.value;
  return `${p["weekday"]} ${p["day"]} ${p["month"]} ${p["year"]}`;
}

/** A UTC-midnight date as "2016-07-08", the form used in URLs. */
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** "2016-07-08" to UTC midnight. */
export const fromIso = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const isIsoDay = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
export const formatMonth = (date: Date) => MONTH.format(date);
