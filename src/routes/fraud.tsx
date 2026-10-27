import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Radar, type FraudRule } from "@/components/fraud/Radar";
import { ReportCards } from "@/components/fraud/ReportCards";
import { PageIntro } from "@/components/site/PageIntro";
import { ErrorPanel, LoadingPanel } from "@/components/site/Panels";
import { useProject } from "@/hooks/useProject";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUrlState } from "@/hooks/useUrlState";
import type { FraudPolicy, ModelKey } from "@/lib/engine";
import { pageTitle, projectInfo } from "@/lib/site";
import { useScheme } from "@/lib/theme";

const LEDE =
  "Flags fraudulent card payments among 284,807 transactions made over two days, 492 of them fraud. Replay the last 9.3 hours, set your own alert rule and review cost, and see what each choice catches and costs.";

const project = projectInfo("fraud");

interface FraudSearch {
  model?: ModelKey | undefined;
  rule?: FraudRule | undefined;
  t?: number | undefined;
  cost?: number | undefined;
}
interface FraudView {
  model: ModelKey;
  rule: FraudRule;
  /** probability cut-off for the threshold rule */
  t: number;
  /** dollars to review one alert */
  cost: number;
}

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);

const parseView = (s: FraudSearch): FraudView => ({
  model: s.model ?? "v2",
  rule: s.rule ?? "threshold",
  t: s.t ?? 0.5,
  cost: s.cost ?? 5,
});
const serializeView = (v: FraudView): FraudSearch => ({
  model: v.model,
  rule: v.rule,
  t: v.t,
  cost: v.cost,
});

export const Route = createFileRoute("/fraud")({
  validateSearch: (s: Record<string, unknown>): FraudSearch => {
    const t = num(s["t"]);
    const cost = num(s["cost"]);
    return {
      model: s["model"] === "v1" || s["model"] === "v2" ? s["model"] : undefined,
      rule: s["rule"] === "threshold" || s["rule"] === "expected_loss" ? s["rule"] : undefined,
      t: t > 0 && t < 1 ? t : undefined,
      cost: cost >= 1 && cost <= 50 ? Math.round(cost) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: pageTitle(project.title) },
      { name: "description", content: LEDE },
      { property: "og:title", content: pageTitle(project.title) },
      { property: "og:description", content: LEDE },
    ],
  }),
  component: FraudPage,
});

function FraudPage() {
  const search = Route.useSearch();
  const [view, setView] = useUrlState(search, parseView, serializeView);
  const {
    data: lab,
    engine,
    progress,
    stage,
    error,
    retry,
  } = useProject("fraud", (e, o) => e.loadFraud(o));
  const scheme = useScheme();
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);

  const policy: FraudPolicy = useMemo(
    () => ({ model: view.model, rule: view.rule, threshold: view.t, reviewCost: view.cost }),
    [view.model, view.rule, view.t, view.cost],
  );

  const v2 = lab?.meta.models["v2_lightgbm"]?.test;
  const v1 = lab?.meta.models["v1_undersampled_logistic"]?.test;
  const facts =
    engine && lab && v2 && v1
      ? [
          {
            value: engine.formatInt(v2.fp),
            from: engine.formatInt(v1.fp),
            label: `false alarms in ${lab.meta.test_hours.toFixed(1)} hours`,
          },
          {
            value: engine.formatSignedUsd(v2.net_savings),
            from: engine.formatSignedUsd(v1.net_savings),
            label: `net result at ${engine.formatUsd(lab.meta.review_cost)} per review`,
          },
          {
            value: v2.avg_precision.toFixed(3),
            from: v1.avg_precision.toFixed(3),
            label: "precision-recall score (average precision, 1 is perfect)",
          },
        ]
      : undefined;

  return (
    <main className="page-wrap">
      <PageIntro
        title={project.title}
        lede={LEDE}
        facts={facts}
        pendingFacts={3}
        notebook={project.notebook}
        code={project.code}
      />
      {error ? (
        <ErrorPanel what="the fraud model" message={error} onRetry={retry} />
      ) : !lab || !engine ? (
        <div className="min-h-[40rem] border-t border-rule pt-8">
          <LoadingPanel stage={stage} progress={progress} />
        </div>
      ) : (
        <>
          <ReportCards meta={lab.meta} engine={engine} />
          <Radar
            lab={lab}
            engine={engine}
            scheme={scheme}
            policy={policy}
            onModel={(model) => setView((v) => ({ ...v, model }))}
            onRule={(rule) => setView((v) => ({ ...v, rule }))}
            onThreshold={(t) => setView((v) => ({ ...v, t }))}
            onReviewCost={(cost) => setView((v) => ({ ...v, cost }))}
            selected={selected}
            onSelect={setSelected}
            reducedMotion={reducedMotion}
          />
        </>
      )}
    </main>
  );
}
