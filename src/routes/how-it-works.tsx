import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/site/DataTable";
import { PageIntro } from "@/components/site/PageIntro";
import { ErrorPanel, LoadingPanel } from "@/components/site/Panels";
import { ENGINE_URL, REPO_URL, loadEngine, type Engine, type ParityCheck } from "@/lib/engine";
import { pageTitle } from "@/lib/site";

const LEDE =
  "Every model on this site was trained in Python and exported as plain JSON. A small TypeScript engine with no dependencies runs them in your browser and reproduces the Python results.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: pageTitle("How it works") },
      { name: "description", content: LEDE },
      { property: "og:title", content: pageTitle("How it works") },
      { property: "og:description", content: LEDE },
    ],
  }),
  component: HowItWorks,
});

/** 3.6e-12, 1e-9, or "exact" for 0 */
function sci(v: number) {
  if (v === 0) return "exact";
  const [m = "", e = ""] = v.toExponential(1).split("e");
  return `${m.replace(/\.0$/, "")}e${e.replace("+", "")}`;
}

type Run =
  | { kind: "idle" }
  | { kind: "running"; progress: number; stage: string }
  | { kind: "done"; checks: ParityCheck[]; engine: Engine }
  | { kind: "error"; message: string };

function Verify() {
  const [run, setRun] = useState<Run>({ kind: "idle" });
  const start = async () => {
    setRun({ kind: "running", progress: 0, stage: "Loading the engine" });
    try {
      const engine = await loadEngine();
      const checks = await engine.selfTest({
        onProgress: (progress, stage) => setRun({ kind: "running", progress, stage }),
      });
      setRun({ kind: "done", checks, engine });
    } catch (e) {
      setRun({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };
  const failed = run.kind === "done" ? run.checks.filter((c) => !c.pass).length : 0;

  return (
    <section aria-labelledby="verify-h" className="mt-16 rounded-lg border border-rule p-6 sm:p-8">
      <h2 id="verify-h" className="font-condensed text-3xl text-ink">
        Verify it in your browser
      </h2>
      <p className="mt-2 max-w-2xl text-ink-2">
        The reference values were exported by the Python code when the models were trained. The
        check downloads about 4 MB the first time.
      </p>
      {(run.kind === "idle" || run.kind === "done") && (
        <button
          type="button"
          onClick={start}
          className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-page hover:opacity-90 lg:min-h-0"
        >
          {run.kind === "done" ? "Run it again" : "Run the check"}
        </button>
      )}
      <div className="mt-6" aria-live="polite">
        {run.kind === "running" && <LoadingPanel stage={run.stage} progress={run.progress} />}
        {run.kind === "error" && (
          <ErrorPanel
            what={`the engine from ${ENGINE_URL}`}
            message={run.message}
            onRetry={start}
          />
        )}
        {run.kind === "done" && (
          <>
            <p
              className={`mb-6 flex items-center gap-2 font-semibold ${failed ? "text-critical" : "text-good"}`}
            >
              {failed ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Check className="h-5 w-5" aria-hidden />
              )}
              {failed
                ? `${failed} of ${run.checks.length} checks failed in this browser`
                : `All ${run.checks.length} checks pass in this browser`}
            </p>
            <DataTable
              caption="Browser results compared with Python's"
              rows={run.checks}
              rowKey={(c, i) => `${c.project}-${i}`}
              columns={[
                { key: "p", header: "Project", render: (c) => c.project },
                { key: "l", header: "What's compared", render: (c) => c.label },
                {
                  key: "n",
                  header: "Values compared",
                  numeric: true,
                  render: (c) => run.engine.formatInt(c.count),
                },
                {
                  key: "e",
                  header: "Largest difference",
                  numeric: true,
                  render: (c) => sci(c.maxError),
                },
                { key: "t", header: "Allowed", numeric: true, render: (c) => sci(c.tolerance) },
                {
                  key: "r",
                  header: "Result",
                  render: (c) =>
                    c.pass ? (
                      <span className="inline-flex items-center gap-1 text-good">
                        <Check className="h-4 w-4" aria-hidden />
                        Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-critical">
                        <X className="h-4 w-4" aria-hidden />
                        Fail
                      </span>
                    ),
                },
              ]}
            />
            <p className="mt-6 text-xs break-all text-ink-3">
              Engine v{run.engine.VERSION}, loaded from{" "}
              <a className="underline" href={ENGINE_URL}>
                {ENGINE_URL}
              </a>
              .{" "}
              <a className="underline" href={REPO_URL}>
                Source on GitHub
              </a>
              .
            </p>
          </>
        )}
      </div>
    </section>
  );
}

const SECTIONS = [
  {
    h: "Graded the way it would be used",
    p: "The rain model learns from 2007 to 2014, tunes on 2015 and is graded on 2016-17 days it never saw. The fraud model is split by time and graded on the last 9.3 hours at the real fraud rate. Insurance uses 5 x 5 repeated cross-validation. Each v2 notebook first rebuilds the original v1 model and shows what it got wrong.",
  },
  {
    h: "Exported, not hosted",
    p: "Trees, coefficients and the test data are plain JSON files in the repo. Nothing runs on a server and nothing you enter leaves your browser.",
  },
  {
    h: "Reproduced in your browser",
    p: "The engine walks LightGBM's trees using LightGBM's own rules for missing values, ports its TreeSHAP algorithm for explanations, and steps the Gaussian mixture exactly as scikit-learn does.",
  },
];

function HowItWorks() {
  return (
    <main className="page-wrap">
      <PageIntro title="How it works" lede={LEDE} />
      <div className="grid grid-cols-1 gap-10 border-t border-rule pt-10 md:grid-cols-3">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-condensed text-2xl text-ink">{s.h}</h2>
            <p className="mt-3 font-serif text-lg text-ink-2">{s.p}</p>
          </section>
        ))}
      </div>
      <Verify />
    </main>
  );
}
