import { loadEngine } from "@/lib/engine";

/** Start downloading the engine as soon as a visitor shows interest in a project. */
export const warmEngine = () => void loadEngine().catch(() => {});
