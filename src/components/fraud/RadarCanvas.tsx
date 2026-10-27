import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Engine, FraudEvent, FraudLab, FraudPolicy, Scheme } from "@/lib/engine";
import { fraudKind, KIND_LABEL } from "./kinds";

export interface CanvasApi {
  draw: () => void;
}

interface Props {
  lab: FraudLab;
  policy: FraudPolicy;
  flags: Uint8Array;
  /** the replay clock in hours; read on every draw so playback never re-renders React */
  clockRef: MutableRefObject<number>;
  apiRef: MutableRefObject<CanvasApi | null>;
  selected: number | null;
  onSelect: (index: number) => void;
  engine: Engine;
  scheme: Scheme;
  label: string;
}

const Z = 9.21; // log-odds of 99.99%
const TICKS = [0.0001, 0.001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.999];
const PAD = { left: 64, right: 14, top: 14, bottom: 44 };
const logit = (p: number) => Math.log(p / (1 - p));
const tickLabel = (p: number) => `${+(p * 100).toPrecision(3)}%`;

interface Palette {
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  page: string;
  caught: string;
  alarm: string;
  missed: string;
}

function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    ink: v("--ink"),
    ink2: v("--ink-2"),
    ink3: v("--ink-3"),
    rule: v("--rule"),
    page: v("--page"),
    caught: v("--series-1"),
    alarm: v("--series-2"),
    missed: v("--critical"),
  };
}

/** Every test payment by time (x) and model score (y, log-odds), drawn on a canvas. */
export function RadarCanvas({
  lab,
  policy,
  flags,
  clockRef,
  apiRef,
  selected,
  onSelect,
  engine,
  scheme,
  label,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(0);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const height = width && width < 640 ? 320 : 420;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setPalette(readPalette()), [scheme]);

  const { model } = policy;
  // y position of every payment as a share of the plot height, per model
  const level = useMemo(() => {
    const p = lab.probability[model];
    const out = new Float32Array(p.length);
    for (let i = 0; i < p.length; i++) {
      const z = Math.max(-Z, Math.min(Z, logit(p[i] ?? 0)));
      out[i] = (z + Z) / (2 * Z);
    }
    return out;
  }, [lab, model]);

  // payments the pointer can pick: every fraud and every alert
  const picks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < lab.count; i++) if (lab.stream.isFraud[i] || flags[i]) out.push(i);
    return out;
  }, [lab, flags]);

  const geo = useMemo(() => {
    const w = width;
    const h = height;
    const pw = Math.max(1, w - PAD.left - PAD.right);
    const ph = Math.max(1, h - PAD.top - PAD.bottom);
    return {
      w,
      h,
      x: (hour: number) => PAD.left + (hour / lab.hours) * pw,
      y: (share: number) => PAD.top + (1 - share) * ph,
      pw,
      ph,
    };
  }, [width, height, lab.hours]);

  // the marks for the current policy, drawn once into an offscreen layer
  useEffect(() => {
    if (!width || !palette) return;
    const dpr = window.devicePixelRatio || 1;
    const off = layer.current ?? document.createElement("canvas");
    layer.current = off;
    off.width = Math.round(geo.w * dpr);
    off.height = Math.round(geo.h * dpr);
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, geo.w, geo.h);
    const fraud = lab.stream.isFraud;
    const hourOf = lab.hourOf;
    const n = lab.count;

    ctx.globalAlpha = scheme === "dark" ? 0.45 : 0.35;
    ctx.fillStyle = palette.ink3;
    for (let i = 0; i < n; i++) {
      if (fraud[i] || flags[i]) continue;
      ctx.fillRect(geo.x(hourOf[i] ?? 0) - 0.75, geo.y(level[i] ?? 0) - 0.75, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.alarm;
    for (let i = 0; i < n; i++) {
      if (fraud[i] || !flags[i]) continue;
      ctx.beginPath();
      ctx.arc(geo.x(hourOf[i] ?? 0), geo.y(level[i] ?? 0), 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    for (let i = 0; i < n; i++) {
      if (!fraud[i]) continue;
      ctx.beginPath();
      ctx.arc(geo.x(hourOf[i] ?? 0), geo.y(level[i] ?? 0), 2.5, 0, 2 * Math.PI);
      if (flags[i]) {
        ctx.fillStyle = palette.caught;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.ink;
        ctx.stroke();
      } else {
        ctx.fillStyle = palette.page;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = palette.missed;
        ctx.stroke();
      }
    }
  }, [lab, flags, level, geo, palette, scheme, width]);

  const draw = () => {
    const el = canvas.current;
    const off = layer.current;
    if (!el || !palette || !width) return;
    const dpr = window.devicePixelRatio || 1;
    if (el.width !== Math.round(geo.w * dpr) || el.height !== Math.round(geo.h * dpr)) {
      el.width = Math.round(geo.w * dpr);
      el.height = Math.round(geo.h * dpr);
    }
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, geo.w, geo.h);
    ctx.font = "12px Archivo, ui-sans-serif, system-ui, sans-serif";

    // gridlines and axes
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.rule;
    ctx.fillStyle = palette.ink3;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const p of TICKS) {
      const y = Math.round(geo.y((logit(p) + Z) / (2 * Z))) + 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(geo.w - PAD.right, y);
      ctx.stroke();
      ctx.fillText(tickLabel(p), PAD.left - 8, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let hour = 0; hour <= Math.floor(lab.hours); hour++) {
      const x = Math.round(geo.x(hour)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, geo.h - PAD.bottom);
      ctx.stroke();
      if (geo.pw > 360 || hour % 2 === 0) ctx.fillText(`${hour}h`, x, geo.h - PAD.bottom + 6);
    }
    ctx.fillStyle = palette.ink2;
    ctx.fillText("Hours since the test window opened", PAD.left + geo.pw / 2, geo.h - 18);
    ctx.save();
    ctx.translate(14, PAD.top + geo.ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "middle";
    ctx.fillText("Chance of fraud (log-odds scale)", 0, 0);
    ctx.restore();

    // the payments seen so far
    const clock = Math.min(lab.hours, Math.max(0, clockRef.current));
    const cut = geo.x(clock);
    if (off && cut > PAD.left) {
      const sw = Math.min(off.width, Math.round(cut * dpr));
      ctx.drawImage(off, 0, 0, sw, off.height, 0, 0, sw / dpr, geo.h);
    }

    // where the replay has got to
    if (clock < lab.hours) {
      ctx.strokeStyle = palette.ink3;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(cut) + 0.5, PAD.top);
      ctx.lineTo(Math.round(cut) + 0.5, geo.h - PAD.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // the alert rule
    ctx.font = "600 12px Archivo, ui-sans-serif, system-ui, sans-serif";
    if (policy.rule === "threshold") {
      const t = policy.threshold ?? 0.5;
      const y = Math.round(geo.y((Math.max(-Z, Math.min(Z, logit(t))) + Z) / (2 * Z))) + 0.5;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(geo.w - PAD.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      const text = `Alert above ${engine.formatChance(t)}`;
      const tw = ctx.measureText(text).width;
      const ty = y < PAD.top + 24 ? y + 6 : y - 22;
      ctx.fillStyle = palette.page;
      ctx.fillRect(geo.w - PAD.right - tw - 10, ty, tw + 8, 17);
      ctx.fillStyle = palette.ink;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(text, geo.w - PAD.right - 6, ty + 2);
    } else {
      const text = `Alert when chance of fraud × amount ≥ ${engine.formatUsd(policy.reviewCost)}: the cut-off varies with amount`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const tw = Math.min(ctx.measureText(text).width, geo.pw - 12);
      ctx.fillStyle = palette.page;
      ctx.fillRect(PAD.left + 4, PAD.top + 4, tw + 8, 18);
      ctx.fillStyle = palette.ink;
      ctx.fillText(text, PAD.left + 8, PAD.top + 7, geo.pw - 16);
    }

    // selected and hovered payments
    const ring = (i: number, r: number, color: string) => {
      ctx.beginPath();
      ctx.arc(geo.x(lab.hourOf[i] ?? 0), geo.y(level[i] ?? 0), r, 0, 2 * Math.PI);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    };
    if (selected !== null && (lab.hourOf[selected] ?? Infinity) < clock)
      ring(selected, 8, palette.ink);
    if (hover !== null && hover !== selected) ring(hover, 7, palette.ink2);
  };

  // redraw whenever anything but the clock changes; playback calls draw() itself
  useEffect(() => {
    apiRef.current = { draw };
    draw();
  });

  // labels are drawn in Archivo: redraw once the web font has arrived
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => alive && apiRef.current?.draw());
    return () => {
      alive = false;
    };
  }, [apiRef]);

  const nearest = (clientX: number, clientY: number) => {
    const el = canvas.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    const clock = clockRef.current;
    let best: number | null = null;
    let bestD = 8;
    for (const i of picks) {
      const hour = lab.hourOf[i] ?? 0;
      if (hour >= clock) continue;
      const d = Math.hypot(geo.x(hour) - px, geo.y(level[i] ?? 0) - py);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const tip: FraudEvent | null =
    hover === null
      ? null
      : {
          index: hover,
          hour: lab.hourOf[hover] ?? 0,
          amount: lab.stream.amount[hover] ?? 0,
          probability: lab.probability[model][hover] ?? 0,
          fraud: lab.stream.isFraud[hover] === 1,
          flagged: flags[hover] === 1,
          kind: fraudKind(lab.stream.isFraud[hover] === 1, flags[hover] === 1),
        };

  return (
    <div ref={wrap} className="relative w-full" style={{ height }}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="block h-full w-full touch-manipulation"
        style={{ cursor: hover !== null ? "pointer" : "crosshair" }}
        onPointerMove={(e) => setHover(nearest(e.clientX, e.clientY))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        onClick={(e) => {
          const i = nearest(e.clientX, e.clientY);
          setHover(i);
          if (i !== null) onSelect(i);
        }}
      />
      {tip && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 w-max max-w-[15rem] rounded-md border border-rule-strong bg-page px-3 py-2 text-sm shadow-sm"
          style={{
            left: geo.x(tip.hour),
            top: geo.y(level[tip.index] ?? 0),
            transform: `translate(${geo.x(tip.hour) > geo.w * 0.65 ? "-100%" : "0%"}, ${
              (level[tip.index] ?? 0) > 0.6 ? "14px" : "calc(-100% - 14px)"
            })`,
          }}
        >
          <p className="font-semibold text-ink">{KIND_LABEL[tip.kind]}</p>
          <p className="tabular text-ink-2">
            Hour {tip.hour.toFixed(2)} · {engine.formatUsd(tip.amount)}
          </p>
          <p className="tabular text-ink-2">
            {engine.formatChance(tip.probability)} chance of fraud
          </p>
        </div>
      )}
    </div>
  );
}
