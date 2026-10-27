import { BellRing, ShieldCheck, ShieldX } from "lucide-react";
import type { FraudEvent } from "@/lib/engine";

export type FraudKind = FraudEvent["kind"];

export const KIND_LABEL: Record<FraudKind, string> = {
  caught: "Caught fraud",
  missed: "Missed fraud",
  false_alarm: "False alarm",
};

export const fraudKind = (fraud: boolean, flagged: boolean): FraudKind =>
  fraud ? (flagged ? "caught" : "missed") : "false_alarm";

const ICON = { caught: ShieldCheck, missed: ShieldX, false_alarm: BellRing };
const COLOR: Record<FraudKind, string> = {
  caught: "var(--series-1)",
  missed: "var(--critical)",
  false_alarm: "var(--series-2)",
};

/** The icon for a kind of event, in the colour of its mark on the radar. */
export function KindIcon({ kind, className = "h-4 w-4" }: { kind: FraudKind; className?: string }) {
  const Icon = ICON[kind];
  return <Icon className={className} style={{ color: COLOR[kind] }} aria-hidden />;
}
