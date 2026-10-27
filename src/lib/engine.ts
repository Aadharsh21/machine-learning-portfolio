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
  features: string[]; // V1-V28 (anonymised), LogAmount, HourSin, HourCos
  splits: Record<"train" | "val" | "test", { rows: number; frauds: number; start_hour: number; end_hour: number }>;
  best_iteration: number; // trees in the v2 model
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
export type InsuranceGroup = "non_smoker" | "smoker_bmi_under_30" | "smoker_bmi_30_plus";
export type InsuranceInput = "age" | "male" | "bmi" | "children" | "smoker" | "region";
export interface Profile {
  age: number; male: 0 | 1; bmi: number; children: number; smoker: 0 | 1;
  region: number; // index into InsuranceCalculator.regions
}
export interface CvScore { mean: number; std: number }
export interface InsuranceMeta {
  rows: number;
  mean_charges: number;
  group_means: Record<InsuranceGroup, number>;
  models: Record<string, { label: string; cv: { r2: CvScore; mae: CvScore; rmse: CvScore } }>; // v1_age_only, linear_all, lightgbm, v2_linear_interactions; 5x5 repeated CV, dollars for mae and rmse
  interval: { target: number; coverage: number; mean_width: number; repeats: number }; // how often the middle-80% range held the real charge on held-out customers
  coefficients: Record<string, number>; // v2 model, dollars: age, age_squared, bmi, children, smoker, male, region_northwest, region_southeast, region_southwest, obese, smoker_obese, smoker_bmi
  source: string;
}
export interface InsuranceCustomer { profile: Profile; charges: number; group: InsuranceGroup }
export interface InsuranceContribution {
  key: InsuranceInput;
  label: string; // "Age", "Sex", "BMI", "Children", "Smoker", "Region"
  text: string; // this profile's value written out: "yes", "31.0", "Southeast"
  value: number; // dollars this input adds to (or takes off) the average customer's charges
}
export interface InsuranceQuote {
  profile: Profile;
  group: InsuranceGroup;
  charges: number; // the model's expected yearly charges
  range: { lo: number; median: number; hi: number }; // where 8 in 10 similar customers land, and the typical charge
  base: number; // the average customer's predicted charges, where contributions start
  contributions: InsuranceContribution[]; // largest first; they add up to charges - base
}
export interface InsuranceCalculator {
  meta: InsuranceMeta;
  model: { predict(p: Profile): number; range(p: Profile): { lo: number; median: number; hi: number }; json: { obese_bmi: number } };
  regions: string[]; // "northeast", "northwest", "southeast", "southwest"
  customers: InsuranceCustomer[]; // all 1,338
  groupLabels: Record<InsuranceGroup, string>; // "Non-smokers", "Smokers, BMI under 30", "Smokers, BMI 30 or more"
  groupOf(p: Profile): InsuranceGroup;
  quote(p: Profile): InsuranceQuote; // exact Shapley values over all 1,338 customers: a few ms
  byAge(p: Profile, from?: number, to?: number): { age: number; charges: number; lo: number; median: number; hi: number }[];
}
// ---- clustering
export interface IrisSweepPoint { k: number; inertia: number; silhouette: number | null; ari: number }
export interface IrisMeta {
  features: string[]; // sepal_length, sepal_width, petal_length, petal_width
  species: string[]; // setosa, versicolor, virginica
  sweep: { raw: IrisSweepPoint[]; scaled: IrisSweepPoint[] }; // k-means for k = 1..8 on cm and standardized measurements
  gmm_bic: { k: number; bic: number }[]; // k = 1..6, lower is better
  methods: Record<string, { label: string; ari: number; matrix: number[][]; matched_accuracy: number }>; // kmeans_raw, kmeans_scaled, ward_raw, gmm_raw; matrix is species (rows) by cluster
  pca_explained_variance: number[];
}
/** "pca" for the first two principal components, or two measurement indices such as [2, 3]. */
export type IrisView = "pca" | [number, number];
export interface IrisFrame {
  iteration: number;
  labels: number[]; // cluster of each flower
  centers: number[][]; // cm
  covariances?: number[][][]; // mixture only, cm²
  weights?: number[]; // mixture only
  inertia?: number; // k-means only, in the space it clustered in
  logLikelihood?: number; // mixture only, mean per flower
}
export interface IrisScore {
  ari: number; // adjusted Rand index against the species: 1 is perfect, 0 is chance
  accuracy: number; // share of flowers in their species' cluster under the best one-to-one matching
  silhouette: number | null; // on the raw measurements; null when k = 1
  counts: number[][]; // flowers per species (rows) and cluster (columns)
  mapping: number[]; // cluster matched to each species, or -1
}
export interface IrisRunOptions {
  method: "kmeans" | "gmm";
  k: number;
  seed?: number; // seeds the k-means++ starting points (default 0)
  scaled?: boolean; // k-means only: cluster standardized measurements instead of cm
  restarts?: number; // try seed, seed + 1, ... and keep the best (lowest inertia / highest likelihood)
  maxIter?: number;
}
export interface IrisRun {
  method: "kmeans" | "gmm"; k: number; seed: number; scaled: boolean; restarts: number;
  frames: IrisFrame[]; // the starting state, then one per iteration (of the kept start)
  converged: boolean;
  score: IrisScore;
  bestSeed: number;
  tries: { seed: number; objective: number; ari: number }[];
}
export interface IrisPlayground {
  meta: IrisMeta;
  features: string[];
  species: string[];
  X: number[][]; // 150 flowers, cm
  truth: number[]; // species index per flower
  explained: number[]; // share of variance on the two principal components
  project(x: number[], view?: IrisView): [number, number];
  points(view?: IrisView): [number, number][];
  ellipse(mean: number[], cov: number[][], view?: IrisView, radius?: number, segments?: number): [number, number][]; // `radius` standard deviations out
  run(o: IrisRunOptions): IrisRun;
  score(labels: ArrayLike<number>, k: number): IrisScore;
}
