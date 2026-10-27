import { useEffect, useSyncExternalStore } from "react";

/** A line of data credits: plain text and links. */
export type CreditPart = string | { text: string; href: string };

let current: CreditPart[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * Lets a page put its data credits in the footer once its model has loaded (they come
 * from the model's meta). Until then the footer shows the credit from src/lib/site.ts.
 */
export function usePageCredit(parts: CreditPart[] | null) {
  const key = JSON.stringify(parts);
  useEffect(() => {
    current = parts;
    emit();
    return () => {
      current = null;
      emit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function usePageCreditValue(): CreditPart[] | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
