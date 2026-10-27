import { REPO_URL } from "@/lib/engine";

export type ProjectSlug = "rain" | "fraud" | "insurance" | "clustering";

export interface ProjectInfo {
  slug: ProjectSlug;
  path: "/rain" | "/fraud" | "/insurance" | "/clustering";
  nav: string;
  title: string;
  question: string;
  accent: string; // tailwind token suffix
  notebook: string;
  code: string;
  credit: string;
  /** published results of the pinned engine version */
  facts: { value: string; from: string; label: string }[];
}

const nb = (n: string) => `${REPO_URL}/blob/main/notebooks/${n}.ipynb`;
const ml = (n: string) => `${REPO_URL}/blob/main/ml/${n}.py`;

export const PROJECTS: ProjectInfo[] = [
  {
    slug: "rain",
    path: "/rain",
    nav: "Rain",
    title: "Rain tomorrow",
    question: "Will it rain tomorrow at one of 49 Australian weather stations?",
    accent: "rain",
    notebook: nb("01-rain-tomorrow"),
    code: ml("rain"),
    credit:
      "Weather data: Australian Bureau of Meteorology, via the Rain in Australia dataset on Kaggle.",
    facts: [
      { value: "86.1%", from: "84.2%", label: "Accuracy" },
      {
        value: "0.892",
        from: "0.859",
        label: "ROC AUC (how well it ranks wet days above dry, 1 is perfect)",
      },
    ],
  },
  {
    slug: "fraud",
    path: "/fraud",
    nav: "Fraud",
    title: "Fraud radar",
    question: "Which card payments are fraud, when 99.8% of them are legitimate?",
    accent: "fraud",
    notebook: nb("02-fraud-detection"),
    code: ml("fraud"),
    credit:
      "Card payments: Credit Card Fraud Detection dataset, Worldline and the Machine Learning Group of ULB, via Kaggle.",
    facts: [
      { value: "8", from: "3,740", label: "False alarms in 9.3 hours" },
      { value: "+$7,803", from: "−$10,274", label: "Net result" },
    ],
  },
  {
    slug: "insurance",
    path: "/insurance",
    nav: "Insurance",
    title: "Insurance costs",
    question: "What will a customer's yearly medical charges be?",
    accent: "insurance",
    notebook: nb("03-insurance-costs"),
    code: ml("insurance"),
    credit: "Insurance data: Medical Cost Personal Datasets, via Kaggle.",
    facts: [
      { value: "0.865", from: "0.714", label: "R² (share of the variation in charges explained)" },
      { value: "$2,344", from: "$4,146", label: "Typical error" },
    ],
  },
  {
    slug: "clustering",
    path: "/clustering",
    nav: "Clustering",
    title: "Clustering playground",
    question: "Can an algorithm that never sees the labels find the three iris species?",
    accent: "iris",
    notebook: nb("04-iris-clustering"),
    code: ml("clustering"),
    credit: "Iris data: R. A. Fisher (1936), via the UCI Machine Learning Repository.",
    facts: [
      { value: "0.904", from: "0.730", label: "Agreement with the species (ARI, 1 is perfect)" },
    ],
  },
];

export const pageTitle = (t: string) => `${t} · Aadharsh Arunn`;

/** The published site, for canonical links and social cards. */
export const SITE_URL = "https://aadharsh-ml-projects.netlify.app";
export const SITE_NAME = "Aadharsh Arunn: Machine learning projects";
export const OG_IMAGE = `${SITE_URL}/og.png`;

/** Title, description, canonical URL and social tags for one page. */
export function pageHead(page: { title: string; description: string; path: string }) {
  const title = pageTitle(page.title);
  const url = `${SITE_URL}${page.path}`;
  return {
    meta: [
      { title },
      { name: "description", content: page.description },
      { property: "og:title", content: title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: page.description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** A project's metadata by slug. */
export function projectInfo(slug: ProjectSlug): ProjectInfo {
  const p = PROJECTS.find((x) => x.slug === slug);
  if (!p) throw new Error(`unknown project ${slug}`);
  return p;
}
