import type { FraudEvent } from "@/lib/engine";

export type FraudKind = FraudEvent["kind"];

export const KIND_LABEL: Record<FraudKind, string> = {
  caught: "Caught fraud",
  missed: "Missed fraud",
  false_alarm: "False alarm",
};

export const fraudKind = (fraud: boolean, flagged: boolean): FraudKind =>
  fraud ? (flagged ? "caught" : "missed") : "false_alarm";
