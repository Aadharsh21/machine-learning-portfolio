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
import { pageHead, projectInfo } from "@/lib/site";

const LEDE =
  "Estimates a customer's yearly medical charges from six facts: age, sex, BMI, children, smoking and region, learned from 1,338 US customers. Describe someone and see the typical bill, the range most people like them fall in, and exactly how each fact moves it.";

const project = projectInfo("insurance");

// the model's region order (Profile.region indexes it)
const REGIONS = ["northeast", "northwest", "southeast", "southwest"] as const;
type Region = (typeof REGIONS)[number];

/** ?age=35&sex=f&bmi=27&children=1&smoker=0&region=northeast */
interface InsuranceSearch {
  age?: number | undefined;
  sex?: "f" | "m" | undefined;
  bmi?: number | undefined;
  children?: number | undefined;
  smoker?: 0 | 1 | undefined;
  region?: Region | undefined;
}

const DEFAULT: Profile = { age: 35, male: 0, bmi: 27, children: 1, smoker: 0, region: 0 };

const parseView = (s: InsuranceSearch): Profile => ({
  age: s.age ?? DEFAULT.age,
  male: s.sex === undefined ? DEFAULT.male : s.sex === "m" ? 1 : 0,
  bmi: s.bmi ?? DEFAULT.bmi,
  children: s.children ?? DEFAULT.children,
  smoker: s.smoker ?? DEFAULT.smoker,
  region: s.region === undefined ? DEFAULT.region : REGIONS.indexOf(s.region),
});
const serializeView = (p: Profile): InsuranceSearch => ({
  age: p.age,
  sex: p.male ? "m" : "f",
  bmi: p.bmi,
  children: p.children,
  smoker: p.smoker,
  region: REGIONS[p.region],
});

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);

export const Route = createFileRoute("/insurance")({
  validateSearch: (s: Record<string, unknown>): InsuranceSearch => {
    const age = num(s["age"]);
    const bmi = num(s["bmi"]);
    const children = num(s["children"]);
    const region = s["region"];
    const sex = s["sex"];
    const smoker = String(s["smoker"]);
    return {
      age: Number.isInteger(age) && age >= 18 && age <= 64 ? age : undefined,
      sex: sex === "f" || sex === "female" ? "f" : sex === "m" || sex === "male" ? "m" : undefined,
      bmi: bmi >= 15 && bmi <= 55 ? Math.round(bmi * 10) / 10 : undefined,
      children: Number.isInteger(children) && children >= 0 && children <= 5 ? children : undefined,
      smoker:
        smoker === "1" || smoker === "yes" || smoker === "true"
          ? 1
          : smoker === "0" || smoker === "no" || smoker === "false"
            ? 0
            : undefined,
      region: REGIONS.includes(region as Region) ? (region as Region) : undefined,
    };
  },
  head: () => pageHead({ title: project.title, description: LEDE, path: "/insurance" }),
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

  usePageCredit(calc ? [`Data: ${calc.meta.source}.`] : null);

  const v2 = calc?.meta.models["v2_linear_interactions"]?.cv;
  const v1 = calc?.meta.models["v1_age_only"]?.cv;
  const facts =
    engine && calc && v2 && v1
      ? [
          {
            value: v2.r2.mean.toFixed(3),
            from: v1.r2.mean.toFixed(3),
            label: "R², the share of the variation explained",
          },
          {
            value: engine.formatUsd(v2.mae.mean),
            from: engine.formatUsd(v1.mae.mean),
            label: "typical error (mean absolute error)",
          },
        ]
      : undefined;

  return (
    <main className="page-wrap">
      <PageIntro
        title={project.title}
        lede={LEDE}
        facts={facts}
        pendingFacts={2}
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
