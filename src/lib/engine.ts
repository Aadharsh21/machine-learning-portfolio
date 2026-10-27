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

// ---- rain: replaced by the Rain prompt
export type RainExplorer = any;
export type ReadingSpec = any;
export type WindField = any;
// ---- fraud: replaced by the Fraud prompt
export type FraudLab = any;
// ---- insurance: replaced by the Insurance prompt
export type InsuranceCalculator = any;
// ---- clustering: replaced by the Clustering prompt
export type IrisPlayground = any;
