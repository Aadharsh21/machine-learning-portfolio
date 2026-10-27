import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bands } from "@/components/insurance/Bands";
import { Calculator } from "@/components/insurance/Calculator";
import { InsuranceResults } from "@/components/insurance/InsuranceResults";
import { PageIntro } from "@/components/site/PageIntro";
import { ErrorPanel, LoadingPanel } from "@/components/site/Panels";
import { useProject } from "@/hooks/useProject";
import { useUrlState } from "@/hooks/useUrlState";
import { usePageCredit } from "@/lib/credits";
import type { Profile } from "@/lib/engine";
import { pageTitle, projectInfo } from "@/lib/site";

const LEDE =
  "What will a customer's medical care cost in a year? A model of 1,338 US insurance customers that gives a likely range, not just a number, and shows exactly which inputs pushed it up or down.";

const project = projectInfo("insurance");

// the model's region order (Profile.region indexes it)
const REGIONS = ["northeast", "northwest", "southeast", "southwest"] as const;
type Region = (typeof REGIONS)[number];

interface InsuranceSearch {
  age?: number | undefined;
  sex?: "female" | "male" | undefined;
  bmi?: number | undefined;
  children?: number | undefined;
  smoker?: "yes" | "no" | undefined;
  region?: Region | undefined;
}

const DEFAULT: Profile = { age: 30, male: 1, bmi: 31, children: 0, smoker: 1, region: 2 };

const parseView = (s: InsuranceSearch): Profile => ({
  age: s.age ?? DEFAULT.age,
  male: s.sex === undefined ? DEFAULT.male : s.sex === "male" ? 1 : 0,
  bmi: s.bmi ?? DEFAULT.bmi,
  children: s.children ?? DEFAULT.children,
  smoker: s.smoker === undefined ? DEFAULT.smoker : s.smoker === "yes" ? 1 : 0,
  region: s.region === undefined ? DEFAULT.region : REGIONS.indexOf(s.region),
});
const serializeView = (p: Profile): InsuranceSearch => ({
  age: p.age,
  sex: p.male ? "male" : "female",
  bmi: p.bmi,
  children: p.children,
  smoker: p.smoker ? "yes" : "no",
  region: REGIONS[p.region],
});

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);

export const Route = createFileRoute("/insurance")({
  validateSearch: (s: Record<string, unknown>): InsuranceSearch => {
    const age = num(s["age"]);
    const bmi = num(s["bmi"]);
    const children = num(s["children"]);
    const region = s["region"];
    return {
      age: Number.isInteger(age) && age >= 18 && age <= 64 ? age : undefined,
      sex: s["sex"] === "female" || s["sex"] === "male" ? s["sex"] : undefined,
      bmi: bmi >= 16 && bmi <= 53 ? Math.round(bmi * 10) / 10 : undefined,
      children: Number.isInteger(children) && children >= 0 && children <= 5 ? children : undefined,
      smoker: s["smoker"] === "yes" || s["smoker"] === "no" ? s["smoker"] : undefined,
      region: REGIONS.includes(region as Region) ? (region as Region) : undefined,
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
  component: InsurancePage,
});

function InsurancePage() {
  const search = Route.useSearch();
  const [profile, setProfile] = useUrlState(search, parseView, serializeView);
  const {
    data: calc,
    engine,
    progress,
    stage,
    error,
    retry,
  } = useProject("insurance", (e, o) => e.loadInsurance(o));
  const quote = useMemo(() => (calc ? calc.quote(profile) : null), [calc, profile]);

  usePageCredit(
    calc
      ? [
          "Data: Medical Cost Personal Datasets, via ",
          { text: "Kaggle", href: "https://www.kaggle.com/datasets/mirichoi0218/insurance" },
          ".",
        ]
      : null,
  );

  const v2 = calc?.meta.models["v2_linear_interactions"]?.cv;
  const v1 = calc?.meta.models["v1_age_only"]?.cv;
  const facts =
    engine && calc && v2 && v1
      ? [
          {
            value: v2.r2.mean.toFixed(3),
            from: v1.r2.mean.toFixed(3),
            label: "R²: share of the variation in charges explained",
          },
          {
            value: engine.formatUsd(v2.mae.mean),
            from: engine.formatUsd(v1.mae.mean),
            label: "typical error on customers it hadn't seen",
          },
          {
            value: engine.formatPercent(calc.meta.interval.coverage),
            label: `of real charges fell inside the ${engine.formatPercent(
              calc.meta.interval.target,
            )} range`,
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
        <ErrorPanel what="the insurance model" message={error} onRetry={retry} />
      ) : !calc || !engine || !quote ? (
        <div className="min-h-[40rem] border-t border-rule pt-8">
          <LoadingPanel stage={stage} progress={progress} />
        </div>
      ) : (
        <>
          <Calculator
            calc={calc}
            engine={engine}
            profile={profile}
            quote={quote}
            onProfile={setProfile}
          />
          <Bands calc={calc} engine={engine} profile={profile} onProfile={setProfile} />
          <InsuranceResults meta={calc.meta} engine={engine} />
        </>
      )}
    </main>
  );
}
