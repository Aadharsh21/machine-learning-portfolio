import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { Fragment } from "react";
import { ACCENT_BORDER } from "@/components/site/accent";
import { PageIntro } from "@/components/site/PageIntro";
import { PROJECTS, pageTitle } from "@/lib/site";

const LEDE =
  "Four projects I rebuilt from my first notebooks into properly evaluated models. Each one was trained in Python, graded the way it would really be used, and runs live in your browser with no server.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: pageTitle("Machine learning projects") },
      { name: "description", content: LEDE },
      { property: "og:title", content: pageTitle("Machine learning projects") },
      { property: "og:description", content: LEDE },
    ],
  }),
  component: Home,
});

const STEPS = [
  "Public datasets",
  "Python training and evaluation",
  "Models exported as JSON",
  "TypeScript engine",
  "Your browser",
];

function Home() {
  return (
    <main className="page-wrap">
      <PageIntro title="Machine learning projects" lede={LEDE} />

      <section aria-labelledby="projects-h" className="border-t border-rule pt-10">
        <h2 id="projects-h" className="sr-only">
          Projects
        </h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PROJECTS.map((p) => (
            <li
              key={p.slug}
              className={`flex flex-col rounded-lg border border-rule border-t-2 ${ACCENT_BORDER[p.accent]} bg-page p-6`}
            >
              <h3 className="font-condensed text-3xl text-ink">{p.title}</h3>
              <p className="mt-2 font-serif text-lg text-ink-2">{p.question}</p>
              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {p.facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-sm text-ink-3">{f.label}</dt>
                    <dd className="tabular mt-1 text-ink">
                      <span className="text-ink-3">{f.from}</span>
                      <ArrowRight
                        className="mx-1.5 inline h-3.5 w-3.5 text-ink-3"
                        aria-label="to"
                      />
                      <span className="font-condensed text-2xl">{f.value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                to={p.path}
                className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-6 text-sm font-semibold text-ink underline-offset-4 hover:underline"
              >
                Open the model <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fit-h" className="mt-16 border-t border-rule pt-10">
        <h2 id="fit-h" className="font-condensed text-3xl text-ink">
          How it fits together
        </h2>
        <ol className="mt-8 flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {STEPS.map((s, i) => (
            <Fragment key={s}>
              <li className="flex flex-1 items-center justify-center rounded-sm border border-rule-strong bg-surface px-3 py-4 text-center text-sm font-medium text-ink">
                {s}
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden className="flex justify-center text-ink-3">
                  <ArrowDown className="h-4 w-4 md:hidden" />
                  <ArrowRight className="hidden h-4 w-4 md:block" />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl font-serif text-lg text-ink-2">
          The browser engine reproduces the Python models: the same probabilities to within 1e-9 and
          the same explanations to within 1e-8.
        </p>
        <div className="mt-8 flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ink-2" aria-hidden />
            <div>
              <p className="font-semibold text-ink">Check it yourself</p>
              <p className="text-sm text-ink-2">
                Run the Python reference results again in this browser and compare.
              </p>
            </div>
          </div>
          <Link
            to="/how-it-works"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            How it works <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
