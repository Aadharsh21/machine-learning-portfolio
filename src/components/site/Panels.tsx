import { AlertTriangle, RotateCcw } from "lucide-react";

export function LoadingPanel({ stage, progress }: { stage: string; progress: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-rule bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-ink-2">{stage}</span>
        <span className="tabular font-medium text-ink">{pct}%</span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Loading progress"
      >
        <div className="h-full bg-ink transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ErrorPanel({ message, what, onRetry }: { message: string; what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-rule-strong bg-surface p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-critical" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-ink">Couldn't load {what}</p>
          <p className="mt-1 break-words text-sm text-ink-2">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-sm bg-ink px-3 py-2 text-sm font-medium text-page hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Retry
          </button>
        </div>
      </div>
    </div>
  );
}
