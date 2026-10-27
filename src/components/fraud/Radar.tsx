import { FastForward, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RangeSlider } from "@/components/site/RangeSlider";
import { Segmented } from "@/components/site/Segmented";
import type { Engine, FraudLab, FraudPolicy, ModelKey, Scheme } from "@/lib/engine";
import { RadarCanvas, type CanvasApi } from "./RadarCanvas";
import { KIND_LABEL, KindIcon } from "./kinds";

export type FraudRule = FraudPolicy["rule"];

interface Props {
  lab: FraudLab;
  engine: Engine;
  scheme: Scheme;
  policy: FraudPolicy;
  onModel: (m: ModelKey) => void;
  onRule: (r: FraudRule) => void;
  onThreshold: (t: number) => void;
  onReviewCost: (c: number) => void;
  selected: number | null;
  onSelect: (index: number) => void;
  reducedMotion: boolean;
  /** shown next to the event feed (the explanation panel) */
  aside?: ReactNode;
}

const MODELS: { value: ModelKey; label: string }[] = [
  { value: "v1", label: "v1: logistic regression" },
  { value: "v2", label: "v2: LightGBM" },
];
const RULES: { value: FraudRule; label: string }[] = [
  { value: "threshold", label: "Alert above a probability" },
  { value: "expected_loss", label: "Alert when expected loss beats review cost" },
];
const SPEEDS: { value: string; label: string }[] = [
  { value: "0.25", label: "15 min per second" },
  { value: "1", label: "1 hour per second" },
  { value: "3", label: "3 hours per second" },
];

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const logit = (p: number) => Math.log(p / (1 - p));
const btn =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface sm:h-9";

/** Replays the 71,202 test payments with any alert policy. */
export function Radar(props: Props) {
  const { lab, engine, scheme, policy, selected, reducedMotion } = props;
  const hours = lab.hours;
  const clockRef = useRef(hours);
  const canvasApi = useRef<CanvasApi | null>(null);
  const [clock, setClock] = useState(hours);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("0.25");

  const flags = useMemo(() => lab.flags(policy), [lab, policy]);
  const atEnd = clock >= hours;
  const upTo = atEnd ? lab.count : lab.indexAt(clock);
  const totals = useMemo(() => lab.evaluate(policy, upTo), [lab, policy, upTo]);
  const events = useMemo(() => lab.events(policy, upTo, 8), [lab, policy, upTo]);

  const setClockNow = (h: number) => {
    const c = Math.min(hours, Math.max(0, h));
    clockRef.current = c;
    setClock(c);
    canvasApi.current?.draw();
  };

  // playback: the canvas redraws every frame; React state follows about 12 times a second
  useEffect(() => {
    if (!playing) return;
    const perSecond = Number(speed);
    let raf = 0;
    let last = performance.now();
    let lastUi = last;
    const tick = (now: number) => {
      const c = Math.min(hours, clockRef.current + ((now - last) / 1000) * perSecond);
      last = now;
      clockRef.current = c;
      canvasApi.current?.draw();
      if (c >= hours) {
        setClock(c);
        setPlaying(false);
        return;
      }
      if (now - lastUi > 80) {
        lastUi = now;
        setClock(c);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, hours]);

  const play = () => {
    if (playing) {
      setPlaying(false);
      setClock(clockRef.current);
      return;
    }
    if (reducedMotion) {
      setClockNow(hours);
      return;
    }
    if (clockRef.current >= hours) setClockNow(0);
    setPlaying(true);
  };

  const hourText = `Hour ${clock.toFixed(1)} of ${hours.toFixed(1)}`;
  const t = policy.threshold ?? 0.5;
  const netGood = totals.net >= 0;
  const summary = `${hourText}: ${totals.tp} of ${totals.tp + totals.fn} frauds caught, ${engine.formatInt(
    totals.fp,
  )} false alarms, net ${engine.formatSignedUsd(totals.net)}.`;

  const rows: [string, string][] = [
    ["Payments seen", engine.formatInt(totals.seen)],
    ["Alerts", `${engine.formatInt(totals.alerts)} (${totals.alertsPerHour.toFixed(1)} an hour)`],
    ["Frauds caught", `${totals.tp} of ${totals.tp + totals.fn}`],
    ["False alarms", engine.formatInt(totals.fp)],
    ["Fraud blocked", engine.formatUsd(totals.blocked)],
    ["Fraud missed", engine.formatUsd(totals.missed)],
    ["Review cost", engine.formatUsd(totals.reviewCost)],
  ];

  return (
    <section id="radar" aria-labelledby="radar-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="radar-h" className="font-condensed text-3xl text-ink">
        The radar
      </h2>
      <p className="mt-2 max-w-3xl text-ink-2">
        Replay the {engine.formatInt(lab.count)} payments of the last {hours.toFixed(1)} hours with
        any alert rule. Every dot is a payment, placed by when it happened and how likely the model
        thinks it is to be fraud.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p id="model-l" className="mb-1.5 text-sm text-ink-2">
            Model
          </p>
          <Segmented label="Model" value={policy.model} options={MODELS} onChange={props.onModel} />
        </div>
        <div>
          <p className="mb-1.5 text-sm text-ink-2">Rule</p>
          <Segmented
            label="Alert rule"
            value={policy.rule}
            options={RULES}
            onChange={props.onRule}
          />
        </div>
        {policy.rule === "threshold" && (
          <div className="w-full sm:w-56">
            <p className="flex justify-between text-sm text-ink-2">
              <span>Alert above</span>
              <span className="tabular font-semibold text-ink">{engine.formatChance(t)}</span>
            </p>
            <RangeSlider
              value={logit(t)}
              min={-9}
              max={9}
              step={0.05}
              color="var(--fraud)"
              label="Alert above this chance of fraud"
              valueText={engine.formatChance(t)}
              onChange={(z) => props.onThreshold(Number(sigmoid(z).toPrecision(4)))}
            />
          </div>
        )}
        <div className="w-full sm:w-56">
          <p className="flex justify-between text-sm text-ink-2">
            <span>Cost to review one alert</span>
            <span className="tabular font-semibold text-ink">
              {engine.formatUsd(policy.reviewCost)}
            </span>
          </p>
          <RangeSlider
            value={policy.reviewCost}
            min={1}
            max={50}
            step={1}
            color="var(--fraud)"
            label="Cost to review one alert"
            valueText={engine.formatUsd(policy.reviewCost)}
            onChange={props.onReviewCost}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="button" className={`${btn} w-28`} onClick={play} aria-pressed={playing}>
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
          {playing ? "Pause" : "Play"}
        </button>
        <div className="min-w-[12rem] flex-1">
          <input
            type="range"
            className="range-day"
            min={0}
            max={hours}
            step={0.01}
            value={clock}
            onChange={(e) => {
              setPlaying(false);
              setClockNow(Number(e.currentTarget.value));
            }}
            aria-label="Replay clock"
            aria-valuetext={hourText}
          />
        </div>
        <span className="tabular text-sm font-medium text-ink">{hourText}</span>
        <Segmented label="Replay speed" value={speed} options={SPEEDS} onChange={setSpeed} />
        <button
          type="button"
          className={btn}
          onClick={() => {
            setPlaying(false);
            setClockNow(hours);
          }}
          disabled={atEnd}
        >
          <FastForward className="h-4 w-4" aria-hidden /> Jump to end
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-9">
          <RadarCanvas
            lab={lab}
            policy={policy}
            flags={flags}
            clockRef={clockRef}
            apiRef={canvasApi}
            selected={selected}
            onSelect={props.onSelect}
            engine={engine}
            scheme={scheme}
            label={`Scatter of the ${engine.formatInt(lab.count)} test payments: time across, the ${
              policy.model
            } model's chance of fraud up, on a log-odds scale. ${summary}`}
          />
          <ul
            className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2"
            aria-label="Legend"
          >
            <li className="flex items-center gap-2">
              <svg width="12" height="12" aria-hidden>
                <rect x="5" y="5" width="2" height="2" fill="var(--ink-3)" />
              </svg>
              Legitimate payment
            </li>
            <li className="flex items-center gap-2">
              <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="2" fill="var(--series-2)" />
              </svg>
              False alarm
            </li>
            <li className="flex items-center gap-2">
              <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="3" fill="var(--series-1)" stroke="var(--ink)" />
              </svg>
              Fraud caught
            </li>
            <li className="flex items-center gap-2">
              <svg width="12" height="12" aria-hidden>
                <circle
                  cx="6"
                  cy="6"
                  r="3"
                  fill="var(--page)"
                  stroke="var(--critical)"
                  strokeWidth="1.5"
                />
              </svg>
              Fraud missed
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="sr-only">Running totals</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-rule p-5 lg:grid-cols-1">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col lg:flex-row lg:items-baseline lg:justify-between lg:gap-3"
              >
                <dt className="text-sm text-ink-2">{k}</dt>
                <dd className="tabular text-right font-medium text-ink lg:text-right">{v}</dd>
              </div>
            ))}
            <div className="col-span-2 border-t border-rule pt-3 lg:col-span-1">
              <dt className="text-sm text-ink-2">Net: fraud blocked minus review cost</dt>
              <dd
                className={`font-condensed tabular mt-1 text-5xl leading-none ${
                  netGood ? "text-good" : "text-critical"
                }`}
              >
                {engine.formatSignedUsd(totals.net)}
              </dd>
            </div>
          </dl>
          <p className="sr-only" aria-live="polite">
            {playing ? "" : summary}
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-condensed text-2xl text-ink">Latest events</h3>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">No frauds or alerts yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-rule border-y border-rule">
              {events.map((e) => (
                <li key={e.index}>
                  <button
                    type="button"
                    onClick={() => props.onSelect(e.index)}
                    aria-pressed={selected === e.index}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-2.5 text-left text-sm hover:bg-surface ${
                      selected === e.index ? "bg-surface" : ""
                    }`}
                  >
                    <KindIcon kind={e.kind} />
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{KIND_LABEL[e.kind]}</span>
                      <span className="tabular ml-2 text-ink-3">Hour {e.hour.toFixed(2)}</span>
                    </span>
                    <span className="tabular text-right text-ink-2">
                      {engine.formatUsd(e.amount)}
                      <span className="ml-3 inline-block w-14 text-ink">
                        {engine.formatChance(e.probability)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
        {props.aside}
      </div>
    </section>
  );
}
