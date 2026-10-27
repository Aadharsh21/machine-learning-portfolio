import { createFileRoute } from "@tanstack/react-router";
import { ChoosingK } from "@/components/iris/ChoosingK";
import { IrisResults } from "@/components/iris/IrisResults";
import { Playground, type IrisSettings } from "@/components/iris/Playground";
import { PageIntro } from "@/components/site/PageIntro";
import { ErrorPanel, LoadingPanel } from "@/components/site/Panels";
import { useProject } from "@/hooks/useProject";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUrlState } from "@/hooks/useUrlState";
import { pageTitle, projectInfo } from "@/lib/site";

const LEDE =
  "Can an algorithm that never sees the labels find the three iris species? Run k-means or a Gaussian mixture on 150 flowers one step at a time, choose the number of clusters, and see how close each gets.";

const project = projectInfo("clustering");

interface ClusteringSearch {
  method?: "kmeans" | "gmm" | undefined;
  k?: number | undefined;
  scaled?: "yes" | undefined;
  seed?: number | undefined;
  starts?: 1 | undefined;
  view?: "petals" | "sepals" | undefined;
}

const parseView = (s: ClusteringSearch): IrisSettings => ({
  method: s.method ?? "kmeans",
  k: s.k ?? 3,
  scaled: s.scaled === "yes",
  seed: s.seed ?? 0,
  starts: s.starts ?? 10,
  view: s.view ?? "pca",
});
const serializeView = (v: IrisSettings): ClusteringSearch => ({
  method: v.method,
  k: v.k,
  scaled: v.method === "kmeans" && v.scaled ? "yes" : undefined,
  seed: v.seed || undefined,
  starts: v.starts === 1 ? 1 : undefined,
  view: v.view === "pca" ? undefined : v.view,
});

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);

export const Route = createFileRoute("/clustering")({
  validateSearch: (s: Record<string, unknown>): ClusteringSearch => {
    const k = num(s["k"]);
    const seed = num(s["seed"]);
    const view = s["view"];
    return {
      method: s["method"] === "kmeans" || s["method"] === "gmm" ? s["method"] : undefined,
      k: Number.isInteger(k) && k >= 1 && k <= 8 ? k : undefined,
      scaled: s["scaled"] === "yes" ? "yes" : undefined,
      seed: Number.isInteger(seed) && seed >= 0 && seed < 1000 ? seed : undefined,
      starts: num(s["starts"]) === 1 ? 1 : undefined,
      view: view === "petals" || view === "sepals" ? view : undefined,
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
          <Playground
            pg={pg}
            engine={engine}
            settings={settings}
            onSettings={setSettings}
            reducedMotion={reducedMotion}
          />
          <ChoosingK
            meta={pg.meta}
            k={settings.k}
            scaled={settings.method === "kmeans" && settings.scaled}
            onPick={(k, method) => tryOut({ k, method })}
          />
          <IrisResults meta={pg.meta} engine={engine} onTry={tryOut} />
        </>
      )}
    </main>
  );
}
