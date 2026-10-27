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
        <div
          className="h-full bg-ink transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** What a project page says when the model files can't be downloaded. */
export const MODEL_FILES_ERROR =
  "Couldn't download the model files. Check your connection and try again.";

// Chrome, Firefox and Safari word a failed import() like this. Browsers remember a failed
// import for the rest of the page's life, so only a fresh page load can fetch the engine again.
const IMPORT_FAILED =
  /dynamically imported module|importing a module script failed|module script failed/i;

export function ErrorPanel({
  message,
  what,
  title,
  onRetry,
}: {
  message: string;
  what: string;
  /** replaces "Couldn't load {what}" as the headline */
  title?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-rule-strong bg-surface p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-critical" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-ink">{title ?? `Couldn't load ${what}`}</p>
          <p className={`mt-1 break-words ${title ? "text-xs text-ink-3" : "text-sm text-ink-2"}`}>
            {title ? `Details: ${message}` : message}
          </p>
          <button
            type="button"
            onClick={() => (IMPORT_FAILED.test(message) ? window.location.reload() : onRetry())}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-3 py-2 text-sm font-medium text-page hover:opacity-90 lg:min-h-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Retry
          </button>
        </div>
      </div>
    </div>
  );
}
