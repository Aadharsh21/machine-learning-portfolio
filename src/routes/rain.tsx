import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Explorer, type LiveState, type RainMode } from "@/components/rain/Explorer";
import { RainResults } from "@/components/rain/RainResults";
import { StationCalendar } from "@/components/rain/StationCalendar";
import { WhatIf } from "@/components/rain/WhatIf";
import { PageIntro } from "@/components/site/PageIntro";
import { ErrorPanel, LoadingPanel } from "@/components/site/Panels";
import { useProject } from "@/hooks/useProject";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUrlState } from "@/hooks/useUrlState";
import { usePageCredit } from "@/lib/credits";
import { isIsoDay, isoDay } from "@/lib/dates";
import type { RainEdits } from "@/lib/engine";
import { pageTitle, projectInfo } from "@/lib/site";
import { useScheme } from "@/lib/theme";

const LEDE =
  "Will it rain tomorrow? A model trained on ten years of daily weather at 49 Australian stations, graded on 2016 and 2017 days it never saw. Pick a station and a day, change the readings, or run it on today's weather.";

const project = projectInfo("rain");
const DEFAULT_STATION = "Sydney";
const DEFAULT_DATE = "2016-07-08";
const NO_EDITS: RainEdits = {};

interface RainSearch {
  mode?: "live" | undefined;
  station?: string | undefined;
  date?: string | undefined;
}
interface RainView {
  mode: RainMode;
  station: string;
  /** the day of the readings, YYYY-MM-DD (kept while live mode is on) */
  date: string;
}

const parseView = (s: RainSearch): RainView => ({
  mode: s.mode === "live" ? "live" : "past",
  station: s.station ?? DEFAULT_STATION,
  date: s.date ?? DEFAULT_DATE,
});
const serializeView = (v: RainView): RainSearch =>
  v.mode === "live" ? { mode: "live", station: v.station } : { station: v.station, date: v.date };

export const Route = createFileRoute("/rain")({
  validateSearch: (s: Record<string, unknown>): RainSearch => {
    const station = s["station"];
    const date = s["date"];
    return {
      mode: s["mode"] === "live" ? "live" : undefined,
      station: typeof station === "string" && /^[A-Za-z]+$/.test(station) ? station : undefined,
      date: isIsoDay(date) ? date : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: pageTitle(project.title) },
      { name: "description", content: LEDE },
      { property: "og:title", content: pageTitle(project.title) },
      { property: "og:description", content: LEDE },
    ],
  }),
  component: RainPage,
});

function RainPage() {
  const search = Route.useSearch();
  const [view, setView] = useUrlState(search, parseView, serializeView);
  const {
    data: rain,
    engine,
    progress,
    stage,
    error,
    retry,
  } = useProject("rain", (e, o) => e.loadRain(o));
  const scheme = useScheme();
  const reducedMotion = useReducedMotion();
  const [live, setLive] = useState<LiveState>({ status: "idle" });
  const [playing, setPlaying] = useState(false);

  const station =
    rain && rain.stations.some((s) => s.id === view.station) ? view.station : DEFAULT_STATION;
  const day = rain ? rain.dayOf(view.date) : 0;

  // "what if" edits belong to one station, day and mode, so they reset when any changes
  const editKey = `${view.mode}|${station}|${day}`;
  const [editState, setEditState] = useState({ key: "", edits: NO_EDITS });
  const edits = editState.key === editKey ? editState.edits : NO_EDITS;
  const setEdits = (next: RainEdits) => setEditState({ key: editKey, edits: next });

  const loadLive = useCallback(() => {
    if (!rain) return;
    setLive({ status: "loading" });
    rain.fetchLive().then(
      (data) => setLive({ status: "ready", data }),
      (e) => setLive({ status: "error", message: e instanceof Error ? e.message : String(e) }),
    );
  }, [rain]);

  useEffect(() => {
    if (rain && view.mode === "live" && live.status === "idle") loadLive();
  }, [rain, view.mode, live.status, loadLive]);

  useEffect(() => {
    if (view.mode !== "past" || reducedMotion) setPlaying(false);
  }, [view.mode, reducedMotion]);

  useEffect(() => {
    if (!playing || !rain) return;
    const id = window.setInterval(() => {
      setView((v) => ({
        ...v,
        date: isoDay(rain.dateOf((rain.dayOf(v.date) + 1) % (rain.lastDay + 1))),
      }));
    }, 420);
    return () => window.clearInterval(id);
  }, [playing, rain, setView]);

  const forecast = useMemo(() => {
    if (!rain) return null;
    if (view.mode === "live")
      return live.status === "ready" ? live.data.forecast(station, edits) : null;
    return rain.forecast(station, day, edits);
  }, [rain, view.mode, live, station, day, edits]);

  const forecastFields =
    view.mode === "live" && live.status === "ready"
      ? (live.data.readings.get(station)?.forecastFields ?? [])
      : [];

  usePageCredit(
    rain
      ? [
          `Data: ${rain.meta.source}. Live readings: `,
          { text: "Open-Meteo", href: "https://open-meteo.com" },
          ".",
        ]
      : null,
  );

  const openDay = (d: number) => {
    if (!rain) return;
    setPlaying(false);
    setView((v) => ({ ...v, mode: "past", date: isoDay(rain.dateOf(d)) }));
    document
      .getElementById("explorer")
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };
  const stationName = rain?.stations.find((s) => s.id === station)?.name ?? station;

  const v2 = rain?.meta.models["v2_lightgbm"]?.test;
  const v1 = rain?.meta.models["v1_logistic"]?.test;
  const facts =
    engine && v2 && v1
      ? [
          {
            value: engine.formatPercent(v2.accuracy, 1),
            from: engine.formatPercent(v1.accuracy, 1),
            label: "right on unseen days",
          },
          {
            value: v2.roc_auc.toFixed(3),
            from: v1.roc_auc.toFixed(3),
            label: "ROC AUC: how well it ranks wet days above dry (1 is perfect)",
          },
        ]
      : undefined;

  return (
    <main className="page-wrap">
      <PageIntro
        title={project.title}
        lede={LEDE}
        facts={facts}
        pendingFacts={2}
        notebook={project.notebook}
        code={project.code}
      />
      {error ? (
        <ErrorPanel what="the rain model" message={error} onRetry={retry} />
      ) : !rain || !engine ? (
        <div className="min-h-[40rem] border-t border-rule pt-8">
          <LoadingPanel stage={stage} progress={progress} />
        </div>
      ) : (
        <Explorer
          rain={rain}
          engine={engine}
          scheme={scheme}
          mode={view.mode}
          station={station}
          day={day}
          live={live}
          forecast={forecast}
          playing={playing}
          canPlay={!reducedMotion}
          onMode={(mode) => setView((v) => ({ ...v, mode }))}
          onStation={(id) => setView((v) => ({ ...v, station: id }))}
          onDay={(d) => setView((v) => ({ ...v, date: isoDay(rain.dateOf(d)) }))}
          onPlaying={setPlaying}
          onRetryLive={loadLive}
        />
      )}
      {rain && engine && (
        <>
          <WhatIf
            engine={engine}
            compass={rain.compass}
            forecast={forecast}
            edits={edits}
            onEdits={setEdits}
            forecastFields={forecastFields}
          />
          <StationCalendar
            rain={rain}
            engine={engine}
            scheme={scheme}
            station={station}
            stationName={stationName}
            selectedDay={view.mode === "past" ? day : null}
            onOpenDay={openDay}
          />
          <RainResults meta={rain.meta} engine={engine} />
        </>
      )}
    </main>
  );
}
