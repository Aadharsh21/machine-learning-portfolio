import { LocateFixed, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/site/Segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Engine,
  RainDayView,
  RainExplorer,
  RainForecast,
  RainLive,
  Scheme,
} from "@/lib/engine";
import { formatDay, fromIso } from "@/lib/dates";
import { ForecastPanel } from "./ForecastPanel";
import { RainMap } from "./RainMap";
import { Timeline } from "./Timeline";

export type RainMode = "past" | "live";
export type LiveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: RainLive }
  | { status: "error"; message: string };

interface Props {
  rain: RainExplorer;
  engine: Engine;
  scheme: Scheme;
  mode: RainMode;
  station: string;
  day: number;
  live: LiveState;
  forecast: RainForecast | null;
  playing: boolean;
  canPlay: boolean;
  onMode: (mode: RainMode) => void;
  onStation: (id: string) => void;
  onDay: (day: number) => void;
  onPlaying: (playing: boolean) => void;
  onRetryLive: () => void;
}

const MODES: { value: RainMode; label: string }[] = [
  { value: "past", label: "Past days (2016-17)" },
  { value: "live", label: "Today, live" },
];

export function Explorer(props: Props) {
  const { rain, engine, scheme, mode, station, day, live, forecast, playing, canPlay } = props;
  const map = useMemo(() => rain.map(), [rain]);
  const [near, setNear] = useState("");
  const stationName = rain.stations.find((s) => s.id === station)?.name ?? station;

  const past = mode === "past";
  const liveData = live.status === "ready" ? live.data : null;
  const dayView: RainDayView = useMemo(() => {
    if (past) return rain.dayView(day);
    if (liveData) return liveData.dayView;
    return {
      stations: rain.stations.map((s) => ({
        station: s,
        probability: null,
        actual: null,
        correct: null,
      })),
      scored: 0,
      correct: 0,
    };
  }, [past, rain, day, liveData]);

  const dayLabel = formatDay(rain.dateOf(day));
  const reading = liveData?.readings.get(station);
  const dateLabel = past
    ? dayLabel
    : reading
      ? `Today, ${formatDay(fromIso(reading.date))}`
      : "Today";

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setNear(
        "Your location isn't available in this browser. Pick a station from the list or the map.",
      );
      return;
    }
    setNear("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { station: s, km } = rain.nearest(pos.coords.latitude, pos.coords.longitude);
        props.onStation(s.id);
        setNear(
          km > 300
            ? `The nearest station is ${s.name}, ${engine.formatInt(km)} km away, so its weather may be quite different from yours.`
            : `Nearest station: ${s.name} (${engine.formatInt(km)} km)`,
        );
      },
      () => setNear("Your location isn't available. Pick a station from the list or the map."),
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const mapLabel = past
    ? `Map of the 49 weather stations coloured by the forecast chance of rain on ${dayLabel}, with rings where it actually rained the next day. ${dayView.correct} of ${dayView.scored} stations were forecast right. Use the station list to choose a station with the keyboard.`
    : `Map of the 49 weather stations coloured by today's forecast chance of rain. Use the station list to choose a station with the keyboard.`;

  return (
    <section
      id="explorer"
      aria-labelledby="explorer-h"
      className="scroll-mt-6 border-t border-rule pt-8"
    >
      <h2 id="explorer-h" className="sr-only">
        Forecast explorer
      </h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Segmented label="Which weather" value={mode} options={MODES} onChange={props.onMode} />
        <div className="flex items-center gap-2">
          <span id="station-label" className="text-sm text-ink-2">
            Station
          </span>
          <Select value={station} onValueChange={props.onStation}>
            <SelectTrigger
              aria-labelledby="station-label"
              className="h-11 w-52 border-rule-strong lg:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rain.stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={locate}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-surface lg:h-9"
        >
          <LocateFixed className="h-4 w-4" aria-hidden /> Nearest to me
        </button>
        <p className="basis-full text-sm text-ink-2 empty:hidden" aria-live="polite">
          {near}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <div className="relative">
            <RainMap
              map={map}
              view={dayView}
              selected={station}
              past={past}
              scheme={scheme}
              engine={engine}
              onSelect={props.onStation}
              label={mapLabel}
            />
            {!past && live.status !== "ready" && (
              <div
                className="absolute inset-x-0 top-1/3 mx-auto w-fit max-w-[90%] rounded-lg border border-rule bg-page px-4 py-3 text-sm shadow-sm"
                role="status"
              >
                {live.status === "error" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-ink">Couldn't fetch today's weather. {live.message}</span>
                    <button
                      type="button"
                      onClick={props.onRetryLive}
                      className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-ink px-3 text-sm font-medium text-page hover:opacity-90 lg:h-9"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden /> Try again
                    </button>
                  </div>
                ) : (
                  <span className="text-ink-2">Fetching today's weather for all 49 stations…</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
              <div>
                <div
                  className="h-2.5 w-44 rounded-sm"
                  style={{ background: engine.chanceGradient(scheme) }}
                  aria-hidden
                />
                <div className="mt-1 flex w-44 justify-between text-xs text-ink-3" aria-hidden>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">Forecast chance of rain, 0 to 100%</p>
              </div>
              {past && (
                <div className="flex items-center gap-2 self-start pt-0.5">
                  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                    <circle
                      cx="11"
                      cy="11"
                      r="9.5"
                      fill="none"
                      stroke="var(--ink)"
                      strokeWidth="1.5"
                    />
                    <circle cx="11" cy="11" r="6" fill={engine.chanceColor(0.7, scheme)} />
                  </svg>
                  It actually rained
                </div>
              )}
            </div>
            {past && dayView.scored > 0 && (
              <p className="text-sm text-ink-2">
                <strong className="font-condensed tabular text-2xl text-ink">
                  {dayView.correct}
                </strong>{" "}
                of {dayView.scored} stations forecast right on {dayLabel}
              </p>
            )}
          </div>

          {past && (
            <Timeline
              rain={rain}
              day={day}
              onDay={props.onDay}
              playing={playing}
              onPlaying={props.onPlaying}
              canPlay={canPlay}
            />
          )}
        </div>

        <div className="min-w-0 lg:col-span-5">
          <ForecastPanel
            engine={engine}
            stationName={stationName}
            dateLabel={dateLabel}
            forecast={forecast}
            busy={playing}
            empty={
              past
                ? `${stationName} has no readings for this day. Pick another day or station.`
                : live.status === "ready"
                  ? `${stationName} has no live readings right now. Pick another station.`
                  : live.status === "error"
                    ? "Today's weather couldn't be fetched."
                    : "Fetching today's weather…"
            }
            footnote={
              !past && reading ? (
                <p className="mt-6 border-t border-rule pt-4 text-sm text-ink-3">
                  Readings from Open-Meteo's weather model for this location
                  {reading.modelRainMm !== null &&
                    `, which itself expects ${reading.modelRainMm} mm in the same window`}
                  . Live forecasts are approximate: the model was trained on the stations' own
                  instruments.
                </p>
              ) : null
            }
          />
        </div>
      </div>
    </section>
  );
}
