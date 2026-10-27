import { Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Segmented } from "@/components/site/Segmented";
import type { Engine, IrisPlayground } from "@/lib/engine";
import {
  SPECIES_SHAPE,
  VIEWS,
  capitalize,
  clusterColors,
  markerPath,
  type ViewKey,
} from "./clusters";
import { IrisPlot } from "./IrisPlot";
import { Scoreboard } from "./Scoreboard";

export interface IrisSettings {
  method: "kmeans" | "gmm";
  k: number;
  scaled: boolean;
  seed: number;
  starts: 1 | 10;
  view: ViewKey;
}

interface Props {
  pg: IrisPlayground;
  engine: Engine;
  settings: IrisSettings;
  onSettings: (next: IrisSettings) => void;
  reducedMotion: boolean;
}

const btn =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40 sm:h-9";
const runKey = (s: IrisSettings) => `${s.method}|${s.k}|${s.scaled}|${s.seed}|${s.starts}`;

/** Run k-means or a Gaussian mixture on the iris flowers, one iteration at a time. */
export function Playground({ pg, engine, settings: s, onSettings, reducedMotion }: Props) {
  const run = useMemo(
    () => pg.run({ method: s.method, k: s.k, seed: s.seed, scaled: s.scaled, restarts: s.starts }),
    [pg, s.method, s.k, s.seed, s.scaled, s.starts],
  );
  const last = run.frames.length - 1;
  const key = runKey(s);

  // the frame shown belongs to one run: the first shows its result, later ones play from the start
  const [anim, setAnim] = useState({ key, frame: last, playing: false });
  const shownKey = useRef(key);
  useLayoutEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    setAnim({ key, frame: reducedMotion ? last : 0, playing: !reducedMotion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const frameIndex = anim.key === key ? Math.min(anim.frame, last) : last;
  const playing = anim.key === key && anim.playing;
  const change = (patch: Partial<IrisSettings>) => onSettings({ ...s, ...patch });

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setAnim((a) =>
        a.frame >= last ? { ...a, frame: last, playing: false } : { ...a, frame: a.frame + 1 },
      );
    }, 550);
    return () => window.clearInterval(id);
  }, [playing, last]);

  const frame = run.frames[frameIndex] ?? run.frames[last]!;
  const frames = useMemo(() => run.frames.slice(0, frameIndex + 1), [run, frameIndex]);
  const colors = useMemo(() => clusterColors(run.score.mapping, s.k), [run, s.k]);
  const score = useMemo(
    () => (frameIndex === last ? run.score : pg.score(frame.labels, s.k)),
    [pg, run, frame, frameIndex, last, s.k],
  );
  const setFrame = (f: number) =>
    setAnim({ key, frame: Math.max(0, Math.min(last, f)), playing: false });
  const togglePlay = () => {
    if (playing) setAnim({ key, frame: frameIndex, playing: false });
    else if (reducedMotion) setAnim({ key, frame: last, playing: false });
    else setAnim({ key, frame: frameIndex >= last ? 0 : frameIndex, playing: true });
  };

  const methodName = s.method === "kmeans" ? "k-means" : "Gaussian mixture";
  const label = `${engine.formatInt(pg.X.length)} iris flowers, coloured by the ${methodName} cluster at iteration ${frame.iteration}, shaped by true species. Agreement with the species: ARI ${score.ari.toFixed(3)}, ${engine.formatPercent(score.accuracy, 1)} of flowers in their species' cluster.`;

  return (
    <section id="playground" aria-labelledby="play-h" className="border-t border-rule pt-10">
      <h2 id="play-h" className="font-condensed text-3xl text-ink">
        The playground
      </h2>
      <p className="mt-2 max-w-3xl text-ink-2">
        Each flower has four measurements. Pick an algorithm and a number of clusters and watch it
        sort the {pg.X.length} flowers without ever seeing their species, then see how close it got.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p className="mb-1.5 text-sm text-ink-2">Algorithm</p>
          <Segmented
            label="Algorithm"
            value={s.method}
            options={[
              { value: "kmeans", label: "k-means" },
              { value: "gmm", label: "Gaussian mixture" },
            ]}
            onChange={(method) => change({ method })}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm text-ink-2">Clusters</p>
          <Segmented
            label="Number of clusters"
            value={String(s.k)}
            options={Array.from({ length: 8 }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
            onChange={(v) => change({ k: Number(v) })}
          />
        </div>
        {s.method === "kmeans" && (
          <div>
            <p className="mb-1.5 text-sm text-ink-2">Measurements</p>
            <Segmented
              label="Measurements"
              value={s.scaled ? "scaled" : "cm"}
              options={[
                { value: "cm", label: "In cm" },
                { value: "scaled", label: "Standardized" },
              ]}
              onChange={(v) => change({ scaled: v === "scaled" })}
            />
          </div>
        )}
        <div>
          <p className="mb-1.5 text-sm text-ink-2">Starting points</p>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Starting points"
              value={String(s.starts)}
              options={[
                { value: "1", label: "One start" },
                { value: "10", label: "Best of 10" },
              ]}
              onChange={(v) => change({ starts: v === "10" ? 10 : 1 })}
            />
            <button
              type="button"
              className={btn}
              onClick={() => change({ seed: (s.seed + s.starts) % 1000 })}
            >
              <Shuffle className="h-4 w-4" aria-hidden /> New start
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="View"
              value={s.view}
              options={[
                { value: "pca", label: "Principal components" },
                { value: "petals", label: "Petals" },
                { value: "sepals", label: "Sepals" },
              ]}
              onChange={(view) => onSettings({ ...s, view })}
            />
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
            </ul>
          </div>
          <div className="mt-4">
            <IrisPlot
              pg={pg}
              view={VIEWS[s.view]}
              frames={frames}
              colors={colors}
              mapping={run.score.mapping}
              label={label}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3">
            <button
              type="button"
              className={`${btn} w-28`}
              onClick={togglePlay}
              aria-pressed={playing}
            >
              {playing ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : frameIndex >= last ? (
                <RotateCcw className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {playing ? "Pause" : frameIndex >= last ? "Replay" : "Play"}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setFrame(frameIndex - 1)}
              disabled={frameIndex === 0}
              aria-label="Previous iteration"
            >
              <SkipBack className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setFrame(frameIndex + 1)}
              disabled={frameIndex >= last}
              aria-label="Next iteration"
            >
              <SkipForward className="h-4 w-4" aria-hidden />
            </button>
            <div className="min-w-[10rem] flex-1">
              <input
                type="range"
                className="range-day"
                min={0}
                max={last}
                step={1}
                value={frameIndex}
                onChange={(e) => setFrame(Number(e.currentTarget.value))}
                aria-label="Iteration"
                aria-valuetext={`Iteration ${frame.iteration} of ${last}`}
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-2">
            Crosses are cluster centres, with dotted trails showing how they moved.
            {s.method === "gmm" &&
              " Ellipses reach two standard deviations out from each component's centre."}{" "}
            {s.view === "pca" &&
              "The principal-component view squeezes all four measurements onto the two directions where the flowers differ most."}
          </p>
        </div>
        <div className="lg:col-span-4" aria-live="polite" aria-busy={playing}>
          <Scoreboard
            engine={engine}
            species={pg.species}
            run={run}
            frame={frame}
            score={score}
            colors={colors}
          />
        </div>
      </div>
    </section>
  );
}
