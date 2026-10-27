/**
 * The ML engine and the four trained models, loaded at runtime from
 * github.com/Aadharsh21/ML-Projects (release v2.0.0, pinned to its commit).
 * Every model runs in the browser. Never reimplement model logic or hard-code
 * results anywhere in this app: call these functions.
 */
export const ENGINE_URL =
  "https://cdn.jsdelivr.net/gh/Aadharsh21/ML-Projects@7bdde3e2bdc0bf75789899cae6b61c46d83e642d/web/dist/index.js";
export const REPO_URL = "https://github.com/Aadharsh21/ML-Projects";

let pending: Promise<Engine> | null = null;
export function loadEngine(): Promise<Engine> {
  if (!pending) {
    pending = import(/* @vite-ignore */ ENGINE_URL) as Promise<Engine>;
    pending.catch(() => (pending = null));
  }
  return pending;
}

export type Scheme = "light" | "dark";
export type ModelKey = "v1" | "v2";
export interface LoadOptions {
  onProgress?: (fraction: number, stage: string) => void;
}

export interface Engine {
  VERSION: string;
  loadRain(o?: LoadOptions): Promise<RainExplorer>;
  loadFraud(o?: LoadOptions): Promise<FraudLab>;
  loadInsurance(o?: LoadOptions): Promise<InsuranceCalculator>;
  loadIris(o?: LoadOptions): Promise<IrisPlayground>;
  /** reruns Python's reference results in this browser: 10 checks */
  selfTest(o?: LoadOptions): Promise<ParityCheck[]>;
  RAIN_READINGS: ReadingSpec[];
  RAIN_WINDS: { field: WindField; label: string }[];
  chanceColor(p: number, scheme?: Scheme): string;
  chanceGradient(scheme?: Scheme): string;
  formatChance(p: number): string; // "42%", "99.6%", "<0.01%"
  formatPercent(v: number, digits?: number): string;
  formatUsd(v: number): string; // "$7,803"
  formatSignedUsd(v: number): string; // "+$7,803", "−$10,274"
  formatInt(v: number): string; // "71,202"
  formatPoints(v: number): string; // a change in probability: "+12 pts"
}

export interface ParityCheck { project: string; label: string; count: number; maxError: number; tolerance: number; pass: boolean }
/** one bar of a waterfall: the probability before and after this input */
export interface Step { label: string; value: number; from: number; to: number; other?: boolean }
export interface Waterfall { start: number; end: number; steps: Step[] }
export interface Scores { accuracy: number; roc_auc: number; avg_precision: number; brier: number; precision: number; recall: number; tp: number; fp: number; fn: number; tn: number }

// ---- rain
export type NumericField =
  | "MinTemp" | "MaxTemp" | "Rainfall" | "Evaporation" | "Sunshine" | "WindGustSpeed" | "WindSpeed9am" | "WindSpeed3pm"
  | "Humidity9am" | "Humidity3pm" | "Pressure9am" | "Pressure3pm" | "Cloud9am" | "Cloud3pm" | "Temp9am" | "Temp3pm";
export type WindField = "WindGustDir" | "WindDir9am" | "WindDir3pm";
export interface Station { id: string; name: string; lat: number; lon: number }
export interface Observation {
  station: string;
  day: number;
  numeric: Record<NumericField, number>; // NaN = not recorded
  wind: Record<WindField, number | null>; // index into compass; null = not recorded
  rainToday: 0 | 1;
  rainTomorrow: 0 | 1;
}
export interface RainEdits { numeric?: Partial<Record<NumericField, number>>; wind?: Partial<Record<WindField, number | null>> }
export interface ReadingSpec { field: NumericField; label: string; min: number; max: number; step: number; unit: string; digits: number; primary: boolean }
export interface RainForecast {
  station: Station;
  date: Date; // the day of the readings; the forecast is for rain by 9am the next day
  live: boolean;
  recorded: Observation;
  observation: Observation; // recorded + edits
  edited: boolean;
  probability: number; // chance of more than 1 mm of rain by 9am the next day
  recordedProbability: number; // before edits
  actual: 0 | 1 | null; // what happened (past days only)
  correct: boolean | null; // whether a 50% cut-off called it right
  waterfall: Waterfall; // from a typical day's chance, biggest reasons first
  sentence: string; // "Rain looks likely mainly because of humidity at 3pm (80%) and sunshine (0.0 h)."
  describe(label: string): string | null; // the reading behind a step label, e.g. "80%"
}
export interface RainDayView {
  stations: { station: Station; probability: number | null; actual: 0 | 1 | null; correct: boolean | null }[];
  scored: number;
  correct: number;
}
export interface LiveReading { station: string; date: string; timezone: string; obs: Observation; forecastFields: string[]; modelRainMm: number | null }
export interface RainLive { fetchedAt: Date; readings: Map<string, LiveReading>; dayView: RainDayView; forecast(station: string, edits?: RainEdits): RainForecast | null }
export interface RainMap {
  width: number;
  height: number;
  land: string; // SVG path d for the mainland and Tasmania
  inset: { x: number; y: number; width: number; height: number; land: string; label: string }; // Norfolk Island box
  points: Record<string, [number, number]>; // station id -> SVG x, y
  labelled: string[]; // big cities to always label
  labelFor(id: string, radius: number): { x: number; y: number; anchor: "start" | "middle" | "end" };
  stationAt(x: number, y: number, maxDistance?: number): string | null;
}
export interface RainMeta {
  stations: Station[];
  splits: Record<"train" | "val" | "test", { rows: number; start: string; end: string; rain_rate: number }>;
  models: Record<string, { label: string; test: Scores }>; // majority, persistence, v1_logistic, v2_logistic, v2_lightgbm
  best_iteration: number; // trees in the model
  ci95: Record<"accuracy" | "roc_auc", [number, number]>;
  calibration: { lo: number; hi: number; mean_predicted: number; observed: number; count: number }[];
  importance: { group: string; mean_abs_shap: number }[];
  per_station: { station: string; days: number; rain_rate: number; accuracy: number; roc_auc: number | null }[];
  source: string;
}
export interface RainExplorer {
  meta: RainMeta;
  stations: Station[]; // A-Z by name
  compass: string[]; // "N", "NNE", ... (16)
  start: string; // "2016-01-01" is day 0
  lastDay: number;
  dateOf(day: number): Date; // UTC midnight: format with timeZone "UTC"
  dayOf(date: string | Date): number; // clamped to the test period
  rainShare: Float32Array; // per day: share of stations where it rained the next day
  dayView(day: number): RainDayView;
  history(station: string): { day: number; date: Date; probability: number; actual: 0 | 1 }[];
  stationStats(station: string): RainMeta["per_station"][number] | undefined;
  forecast(station: string, day: number, edits?: RainEdits): RainForecast | null; // null: no readings that day
  fetchLive(): Promise<RainLive>;
  nearest(lat: number, lon: number): { station: Station; km: number };
  map(width?: number, height?: number): RainMap; // default 760 x 600
}
// ---- fraud: replaced by the Fraud prompt
export type FraudLab = any;
// ---- insurance: replaced by the Insurance prompt
export type InsuranceCalculator = any;
// ---- clustering: replaced by the Clustering prompt
export type IrisPlayground = any;
