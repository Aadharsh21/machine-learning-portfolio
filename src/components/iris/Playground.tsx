import { Check, Pause, Play, RotateCcw, Shuffle, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RangeSlider } from "@/components/site/RangeSlider";
import { Segmented } from "@/components/site/Segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Engine, IrisPlayground, IrisRun } from "@/lib/engine";
import {
  restartsFor,
  SPECIES_SHAPE,
  VIEWS,
  VIEW_LABEL,
  capitalize,
  clusterColors,
  markerPath,
  type ViewKey,
} from "./clusters";
import { IrisPlot } from "./IrisPlot";
import { ObjectiveChart } from "./ObjectiveChart";
import { Scoreboard } from "./Scoreboard";

export interface IrisSettings {
  method: "kmeans" | "gmm";
  k: number;
  seed: number;
  /** k-means only: cluster standardized measurements */
  scaled: boolean;
  /** keep the best of several starts (20 for k-means, 10 for the mixture) */
  best: boolean;
  view: ViewKey;
}

interface Props {
  pg: IrisPlayground;
  engine: Engine;
  settings: IrisSettings;
  onSettings: (next: IrisSettings) => void;
}

const btn =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40 lg:h-9";

/** Run k-means or a Gaussian mixture on the iris flowers, one iteration at a time. */
export function Playground({ pg, engine, settings: s, onSettings }: Props) {
  const [showSpecies, setShowSpecies] = useState(true);
  const restarts = s.best ? restartsFor(s.method) : 1;
  const run = useMemo(
    () =>
      pg.run({
        method: s.method,
        k: s.k,
        seed: s.seed,
        scaled: s.method === "kmeans" && s.scaled,
        restarts,
      }),
    [pg, s.method, s.k, s.seed, s.scaled, restarts],
  );
  const last = run.frames.length - 1;

  // the frame shown belongs to one run; a new run starts on its last frame so the result shows
  const [pos, setPos] = useState<{ run: IrisRun; frame: number; playing: boolean }>({
    run,
    frame: last,
    playing: false,
  });
  const frameIndex = pos.run === run ? Math.min(pos.frame, last) : last;
  const playing = pos.run === run && pos.playing;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPos((p) =>
        p.frame >= last ? { ...p, frame: last, playing: false } : { ...p, frame: p.frame + 1 },
      );
    }, 600);
    return () => window.clearInterval(id);
  }, [playing, last]);

  const frame = run.frames[frameIndex] ?? run.frames[last]!;
  const frames = useMemo(() => run.frames.slice(0, frameIndex + 1), [run, frameIndex]);
  const colors = useMemo(() => clusterColors(run.score.mapping, s.k), [run, s.k]);
  const lastIteration = run.frames[last]?.iteration ?? 0;
  const atEnd = frameIndex === last;

  const change = (patch: Partial<IrisSettings>) => onSettings({ ...s, ...patch });
  const setFrame = (f: number) =>
    setPos({ run, frame: Math.max(0, Math.min(last, f)), playing: false });
  const play = () => {
    if (playing) setPos({ run, frame: frameIndex, playing: false });
    else setPos({ run, frame: atEnd ? 0 : frameIndex, playing: true });
  };

  const methodName = s.method === "kmeans" ? "k-means" : "Gaussian mixture";
  const label = `${engine.formatInt(pg.X.length)} iris flowers coloured by ${methodName} cluster at iteration ${
    frame.iteration
  } of ${lastIteration}${showSpecies ? ", shaped by species" : ""}. Final agreement with the species: ARI ${run.score.ari.toFixed(
    3,
  )}, ${engine.formatPercent(run.score.accuracy, 1)} of flowers in their species' cluster.`;

  return (
    <section
      id="playground"
      aria-labelledby="play-h"
      className="scroll-mt-6 border-t border-rule pt-10"
    >
      <h2 id="play-h" className="font-condensed text-3xl text-ink">
        The playground
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div>
            <p className="mb-1.5 text-sm text-ink-2">Method</p>
            <Segmented
              label="Method"
              value={s.method}
              options={[
                { value: "kmeans", label: "k-means" },
                { value: "gmm", label: "Gaussian mixture" },
              ]}
              onChange={(method) => change({ method })}
            />
          </div>
          <div>
            <p className="flex justify-between text-sm text-ink-2">
              <span>Clusters (k)</span>
              <span className="tabular font-semibold text-ink">{s.k}</span>
            </p>
            <RangeSlider
              value={s.k}
              min={1}
              max={8}
              step={1}
              color="var(--iris)"
              label="Number of clusters"
              valueText={`${s.k} clusters`}
              onChange={(k) => change({ k })}
            />
          </div>
          <div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <label htmlFor="scaled" className="text-sm text-ink-2">
                Standardize the measurements
              </label>
              <Switch
                id="scaled"
                checked={s.method === "kmeans" && s.scaled}
                disabled={s.method !== "kmeans"}
                onCheckedChange={(scaled) => change({ scaled })}
              />
            </div>
            {s.method !== "kmeans" && (
              <p className="text-xs text-ink-3">
                The mixture always works in centimetres: it fits each cluster's own spread.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="tabular text-sm text-ink-2">
              Start <span className="font-semibold text-ink">{s.seed}</span>
              {s.best && ` to ${s.seed + restarts - 1}`}
            </span>
            <button
              type="button"
              className={btn}
              onClick={() => change({ seed: (s.seed + restarts) % 1000 })}
            >
              <Shuffle className="h-4 w-4" aria-hidden /> New start
            </button>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="best" className="text-sm text-ink-2">
              Keep the best of several starts
            </label>
            <Switch id="best" checked={s.best} onCheckedChange={(best) => change({ best })} />
          </div>
          <div>
            <p id="view-l" className="mb-1.5 text-sm text-ink-2">
              View
            </p>
            <Select value={s.view} onValueChange={(view) => change({ view: view as ViewKey })}>
              <SelectTrigger aria-labelledby="view-l" className="h-11 border-rule-strong lg:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VIEWS) as ViewKey[]).map((v) => (
                  <SelectItem key={v} value={v}>
                    {VIEW_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="species" className="text-sm text-ink-2">
              Show species
            </label>
            <Switch id="species" checked={showSpecies} onCheckedChange={setShowSpecies} />
          </div>
        </div>

        <div className="min-w-0 lg:col-span-8">
          {showSpecies && (
            <ul
              className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2"
              aria-label="Species shapes"
            >
              {pg.species.map((sp, i) => (
                <li key={sp} className="flex items-center gap-1.5">
                  <svg width="12" height="12" aria-hidden>
                    <path
                      d={markerPath(SPECIES_SHAPE[i] ?? "circle", 6, 6.5, 4.5)}
                      fill="var(--ink-3)"
                    />
                  </svg>
                  {capitalize(sp)}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <svg width="16" height="16" aria-hidden>
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    fill="var(--iris)"
                    stroke="var(--ink)"
                    strokeWidth="1.5"
                  />
                  <path d="M5,5L11,11M11,5L5,11" stroke="var(--page)" strokeWidth="2" />
                </svg>
                Cluster centre
              </li>
            </ul>
          )}
          <div className="mt-3">
            <IrisPlot
              pg={pg}
              view={VIEWS[s.view]}
              frames={frames}
              colors={colors}
              mapping={run.score.mapping}
              showSpecies={showSpecies}
              label={label}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3">
            <button type="button" className={`${btn} w-24`} onClick={play} aria-pressed={playing}>
              {playing ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setFrame(frameIndex + 1)}
              disabled={atEnd}
            >
              <StepForward className="h-4 w-4" aria-hidden /> Step
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setFrame(0)}
              disabled={frameIndex === 0}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset
            </button>
            <div className="min-w-[8rem] flex-1">
              <input
                type="range"
                className="range-day"
                min={0}
                max={last}
                step={1}
                value={frameIndex}
                onChange={(e) => setFrame(Number(e.currentTarget.value))}
                aria-label="Iteration"
                aria-valuetext={`Iteration ${frame.iteration} of ${lastIteration}`}
              />
            </div>
          </div>
          <p
            className="mt-3 flex flex-wrap items-center gap-3 text-sm"
            aria-live="polite"
            aria-busy={playing}
          >
            <span className="tabular font-medium text-ink">
              Iteration {frame.iteration} of {lastIteration}
            </span>
            {atEnd && run.converged && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rule px-2.5 py-0.5 font-medium text-good">
                <Check className="h-4 w-4" aria-hidden /> Converged
              </span>
            )}
            {atEnd && !run.converged && (
              <span className="text-ink-2">Stopped at the iteration limit</span>
            )}
          </p>
          <div className="mt-6">
            <ObjectiveChart run={run} frameIndex={frameIndex} onFrame={setFrame} />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Scoreboard engine={engine} species={pg.species} run={run} colors={colors} />
      </div>
    </section>
  );
}
