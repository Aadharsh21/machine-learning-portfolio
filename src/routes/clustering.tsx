import { createFileRoute } from "@tanstack/react-router";
import { ChoosingK } from "@/components/iris/ChoosingK";
import { VIEWS, type ViewKey } from "@/components/iris/clusters";
import { IrisResults } from "@/components/iris/IrisResults";
import { Playground, type IrisSettings } from "@/components/iris/Playground";
import { PageIntro } from "@/components/site/PageIntro";
import { ErrorPanel, LoadingPanel } from "@/components/site/Panels";
import { useProject } from "@/hooks/useProject";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUrlState } from "@/hooks/useUrlState";
import { usePageCredit } from "@/lib/credits";
import { pageTitle, projectInfo } from "@/lib/site";

const LEDE =
  "Can an algorithm that never sees the labels recover the three iris species from four flower measurements? Run k-means or a Gaussian mixture one step at a time and see where it lands.";

const project = projectInfo("clustering");

/** ?method=kmeans&k=3&seed=0&scaled=0&best=0&view=pca */
interface ClusteringSearch {
  method?: "kmeans" | "gmm" | undefined;
  k?: number | undefined;
  seed?: number | undefined;
  scaled?: 0 | 1 | undefined;
  best?: 0 | 1 | undefined;
  view?: ViewKey | undefined;
}

const parseView = (s: ClusteringSearch): IrisSettings => ({
  method: s.method ?? "kmeans",
  k: s.k ?? 3,
  seed: s.seed ?? 0,
  scaled: s.scaled === 1,
  best: s.best === 1,
  view: s.view ?? "pca",
});
const serializeView = (v: IrisSettings): ClusteringSearch => ({
  method: v.method,
  k: v.k,
  seed: v.seed,
  scaled: v.scaled ? 1 : 0,
  best: v.best ? 1 : 0,
  view: v.view,
});

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);
const flag = (v: unknown) => {
  const t = String(v);
  return t === "1" || t === "true" || t === "yes"
    ? 1
    : t === "0" || t === "false" || t === "no"
      ? 0
      : undefined;
};

export const Route = createFileRoute("/clustering")({
  validateSearch: (s: Record<string, unknown>): ClusteringSearch => {
    const k = num(s["k"]);
    const seed = num(s["seed"]);
    const view = s["view"];
    return {
      method: s["method"] === "kmeans" || s["method"] === "gmm" ? s["method"] : undefined,
      k: Number.isInteger(k) && k >= 1 && k <= 8 ? k : undefined,
      seed: Number.isInteger(seed) && seed >= 0 && seed < 1000 ? seed : undefined,
      scaled: flag(s["scaled"]),
      best: flag(s["best"]),
      view: typeof view === "string" && view in VIEWS ? (view as ViewKey) : undefined,
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
  component: ClusteringPage,
});

function ClusteringPage() {
  const search = Route.useSearch();
  const [settings, setSettings] = useUrlState(search, parseView, serializeView);
  const {
    data: pg,
    engine,
    progress,
    stage,
    error,
    retry,
  } = useProject("iris", (e, o) => e.loadIris(o));
  const reducedMotion = useReducedMotion();
  usePageCredit(pg ? ["Data: Fisher's iris data (1936), as bundled with scikit-learn."] : null);

  const gmm = pg?.meta.methods["gmm_raw"];
  const km = pg?.meta.methods["kmeans_raw"];
  const facts =
    engine && gmm && km
      ? [
          {
            value: gmm.ari.toFixed(3),
            from: km.ari.toFixed(3),
            label: "agreement with the species (ARI, 1 is perfect)",
          },
          {
            value: engine.formatPercent(gmm.matched_accuracy, 1),
            from: engine.formatPercent(km.matched_accuracy, 1),
            label: "of flowers in their species' cluster",
          },
        ]
      : undefined;

  const tryOut = (patch: Partial<IrisSettings>) => {
    setSettings((v) => ({ ...v, ...patch }));
    document
      .getElementById("playground")
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

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
        <ErrorPanel what="the clustering playground" message={error} onRetry={retry} />
      ) : !pg || !engine ? (
        <div className="min-h-[40rem] border-t border-rule pt-8">
          <LoadingPanel stage={stage} progress={progress} />
        </div>
      ) : (
        <>
          <Playground pg={pg} engine={engine} settings={settings} onSettings={setSettings} />
          <ChoosingK
            meta={pg.meta}
            k={settings.k}
            onPick={(k, method, scaled) => tryOut({ k, method, scaled })}
          />
          <IrisResults meta={pg.meta} engine={engine} onTry={tryOut} />
        </>
      )}
    </main>
  );
}
