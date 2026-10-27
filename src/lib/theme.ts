import { useEffect, useState, useSyncExternalStore } from "react";
import type { Scheme } from "@/lib/engine";

export type ThemePref = "system" | "light" | "dark";
const KEY = "theme";
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  if (pref !== "system") el.classList.add(pref);
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable */
  }
  apply(pref);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && (apply(readPref()), l());
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => "system");
}

/** The resolved scheme ("light" | "dark"), updating live. For SVG and canvas drawing. */
export function useScheme(): Scheme {
  const pref = useThemePref();
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

/** Runs before hydration so the saved theme applies without a flash. */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.classList.add(t)}catch(e){}`;
