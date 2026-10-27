import { useEffect, useState } from "react";
import { loadEngine, type Engine, type LoadOptions } from "@/lib/engine";

type Loader<T> = (engine: Engine, options: LoadOptions) => Promise<T>;
type Listener = (fraction: number, stage: string) => void;
type State<T> = { data: T | null; engine: Engine | null; error: string | null; progress: number; stage: string };

let engineLoaded: Engine | null = null;
const pending = new Map<string, Promise<unknown>>();
const ready = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();

/**
 * Loads a project once per visit. Components using the same key share the load and its
 * progress. `engine` (formatters, colours, reading specs) is set whenever `data` is.
 */
export function useProject<T>(key: string, load: Loader<T>) {
  const [state, setState] = useState<State<T>>(() =>
    ready.has(key)
      ? { data: ready.get(key) as T, engine: engineLoaded, error: null, progress: 1, stage: "Ready" }
      : { data: null, engine: null, error: null, progress: 0, stage: "Loading the engine" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (ready.has(key)) return;
    let alive = true;
    const onProgress: Listener = (progress, stage) => {
      if (alive) setState((s) => ({ ...s, progress, stage }));
    };
    const set = listeners.get(key) ?? new Set<Listener>();
    listeners.set(key, set);
    set.add(onProgress);
    let job = pending.get(key) as Promise<T> | undefined;
    if (!job) {
      job = loadEngine().then((engine) => {
        engineLoaded = engine;
        return load(engine, { onProgress: (f, s) => set.forEach((l) => l(f, s)) });
      });
      pending.set(key, job);
      job.then((data) => ready.set(key, data), () => pending.delete(key));
    }
    job.then(
      (data) => alive && setState({ data, engine: engineLoaded, error: null, progress: 1, stage: "Ready" }),
      (e) => alive && setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) })),
    );
    return () => {
      alive = false;
      set.delete(onProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = () => {
    setState({ data: null, engine: null, error: null, progress: 0, stage: "Loading the engine" });
    setAttempt((a) => a + 1);
  };
  return { ...state, retry };
}
