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
// ---- fraud
export interface FraudPolicy { model: ModelKey; rule: "threshold" | "expected_loss"; threshold?: number; reviewCost: number }
export interface FraudOutcome {
  seen: number; alerts: number; tp: number; fp: number; fn: number; tn: number; // tp = frauds caught, fp = false alarms, fn = frauds missed
  blocked: number; missed: number; reviewCost: number; net: number; // dollars: net = blocked - reviewCost
  precision: number | null; recall: number | null; hours: number; alertsPerHour: number;
}
export interface FraudEvent { index: number; hour: number; amount: number; probability: number; fraud: boolean; flagged: boolean; kind: "caught" | "missed" | "false_alarm" }
export interface TradeoffPoint { threshold: number; alerts: number; tp: number; fp: number; precision: number | null; recall: number; blocked: number; net: number }
export interface FraudScores extends Scores {
  blocked: number; missed: number; review_cost: number; net_savings: number; alerts: number; alerts_per_hour: number;
  avg_precision_ci95: [number, number];
  expected_loss_rule: { blocked: number; missed: number; review_cost: number; net_savings: number; alerts: number; tp: number; fp: number };
}
export interface FraudMeta {
  splits: Record<"train" | "val" | "test", { rows: number; frauds: number; start_hour: number; end_hour: number }>;
  test_hours: number;
  test_fraud_amount: number;
  review_cost: number; // $5 per alert
  models: Record<string, { label: string; test: FraudScores }>; // v1_undersampled_logistic, weighted_logistic, v2_lightgbm
  v1_balanced_view: Scores; // v1 graded on a balanced 50/50 sample, the way v1 graded itself
  pr_curves: Record<ModelKey, [number, number][]>; // [recall, precision] pairs
  importance: { feature: string; mean_abs_shap: number }[];
  source: string;
}
export interface FraudExplanation { index: number; probability: number; waterfall: Waterfall; contributions: { label: string; value: number }[] }
export interface FraudLab {
  meta: FraudMeta;
  count: number; // 71,202 transactions
  hours: number; // 9.3 hours
  hourOf: Float64Array; // hours since the window opened, per transaction (sorted)
  probability: Record<ModelKey, Float64Array>; // P(fraud) per transaction
  stream: { amount: Float64Array; isFraud: Uint8Array };
  flags(policy: FraudPolicy): Uint8Array; // 1 = alert
  evaluate(policy: FraudPolicy, upTo?: number): FraudOutcome; // over the first `upTo` transactions
  indexAt(hour: number): number; // transactions before that hour
  events(policy: FraudPolicy, upTo?: number, limit?: number): FraudEvent[]; // frauds and alerts, newest first
  tradeoff(model: ModelKey, reviewCost: number, points?: number): { points: TradeoffPoint[]; best: TradeoffPoint }; // strict to lenient
  canExplain(index: number): boolean;
  explain(index: number): Promise<FraudExplanation | null>; // v2's reasons; downloads the model on first use
}
// ---- insurance
export interface Profile { age: number; male: 0 | 1; bmi: number; children: number; smoker: 0 | 1; region: number } // region indexes regions
export type InsuranceGroup = "non_smoker" | "smoker_bmi_under_30" | "smoker_bmi_30_plus";
export interface InsuranceQuote {
  profile: Profile;
  group: InsuranceGroup;
  charges: number; // the model's expected (average) yearly charges, pulled up by rare very large bills
  range: { lo: number; median: number; hi: number }; // typical (median) charge, and where 8 in 10 similar customers land
  base: number; // the average customer's charges: where the contributions start
  contributions: { key: string; label: string; text: string; value: number }[]; // dollars, largest first; they add up to charges - base
}
export interface CvScore { mean: number; std: number }
export interface InsuranceMeta {
  rows: number;
  mean_charges: number;
  group_means: Record<InsuranceGroup, number>;
  models: Record<string, { label: string; cv: { r2: CvScore; mae: CvScore; rmse: CvScore } }>; // v1_age_only, linear_all, lightgbm, v2_linear_interactions
  interval: { target: number; coverage: number; mean_width: number; repeats: number };
  coefficients: Record<string, number>; // dollars
  source: string;
}
export interface InsuranceCalculator {
  meta: InsuranceMeta;
  regions: string[]; // northeast, northwest, southeast, southwest
  customers: { profile: Profile; charges: number; group: InsuranceGroup }[]; // all 1,338
  groupLabels: Record<InsuranceGroup, string>;
  groupOf(p: Profile): InsuranceGroup;
  quote(p: Profile): InsuranceQuote;
  byAge(p: Profile, from?: number, to?: number): { age: number; charges: number; lo: number; median: number; hi: number }[];
}
// ---- clustering
export type IrisView = "pca" | [number, number]; // the PCA plane, or two measurement indices such as [2, 3]
export interface IrisFrame {
  iteration: number;
  labels: number[]; // cluster of each flower
  centers: number[][]; // cm
  covariances?: number[][][]; // Gaussian mixture only
  weights?: number[];
  inertia?: number; // k-means only
  logLikelihood?: number; // Gaussian mixture only
}
export interface IrisScore {
  ari: number; // adjusted Rand index vs the species: 1 perfect, 0 chance
  accuracy: number; // share of flowers in their species' cluster (best matching)
  silhouette: number | null;
  counts: number[][]; // species (rows) x cluster (columns)
  mapping: number[]; // cluster matched to each species, -1 for none
}
export interface IrisRun {
  method: "kmeans" | "gmm"; k: number; seed: number; scaled: boolean; restarts: number;
  frames: IrisFrame[]; // the start, then one per iteration
  converged: boolean;
  score: IrisScore;
  bestSeed: number;
  tries: { seed: number; objective: number; ari: number }[]; // every start: inertia (k-means) or log-likelihood
}
export interface IrisMeta {
  sweep: Record<"raw" | "scaled", { k: number; inertia: number; silhouette: number | null; ari: number }[]>; // k-means, k = 1..8
  gmm_bic: { k: number; bic: number }[];
  methods: Record<string, { label: string; ari: number; matrix: number[][]; matched_accuracy: number }>; // kmeans_raw, kmeans_scaled, ward_raw, gmm_raw
  pca_explained_variance: number[];
}
export interface IrisPlayground {
  meta: IrisMeta;
  features: string[]; // sepal_length, sepal_width, petal_length, petal_width (cm)
  species: string[]; // setosa, versicolor, virginica
  X: number[][]; // 150 x 4
  truth: number[]; // species index per flower
  explained: number[]; // variance share of PC1, PC2
  project(x: number[], view?: IrisView): [number, number];
  points(view?: IrisView): [number, number][];
  ellipse(mean: number[], cov: number[][], view?: IrisView, radius?: number): [number, number][]; // polygon
  run(o: { method: "kmeans" | "gmm"; k: number; seed?: number; scaled?: boolean; restarts?: number }): IrisRun;
  score(labels: ArrayLike<number>, k: number): IrisScore;
}
