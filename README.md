# Machine learning projects: the website

**Live site:** https://aadharsh-ml-projects.netlify.app

The website for [ML-Projects](https://github.com/Aadharsh21/ML-Projects), four machine learning
projects you can use live in the browser. Every number on the site is computed in the visitor's
browser by the trained models from that repo. Nothing is sent to a server.

| Page | What you can do |
| --- | --- |
| [Rain tomorrow](https://aadharsh-ml-projects.netlify.app/rain) | Forecast rain at 49 Australian weather stations on any 2016-17 day, change the readings and watch the forecast move, or run it on today's weather. |
| [Fraud radar](https://aadharsh-ml-projects.netlify.app/fraud) | Replay 9.3 hours of card payments with your own alert rule and review cost, and see what each choice catches and costs. |
| [Insurance costs](https://aadharsh-ml-projects.netlify.app/insurance) | Describe a customer and get the typical yearly bill, the range most people like them pay, and exactly how each fact moves it. |
| [Clustering playground](https://aadharsh-ml-projects.netlify.app/clustering) | Run k-means or a Gaussian mixture on the iris flowers one iteration at a time and score it against the species. |
| [How it works](https://aadharsh-ml-projects.netlify.app/how-it-works) | Rerun the Python reference results in your browser: 10 parity checks. |

## How it fits together

1. The models are trained and evaluated in Python in
   [ML-Projects](https://github.com/Aadharsh21/ML-Projects) and exported as plain JSON.
2. A small, dependency-free TypeScript engine in the same repo runs them, matching Python's
   probabilities to within 1e-9 and its explanations to within 1e-8.
3. This site imports that engine from jsDelivr, pinned to a commit
   ([`src/lib/engine.ts`](src/lib/engine.ts)), and loads each project once per visit with
   [`src/hooks/useProject.ts`](src/hooks/useProject.ts).

The pages never compute or hard-code a model result themselves: everything comes from the engine
or its exported metadata.

## Stack

React 19 and TanStack Start (file-based routes, server rendering), TypeScript, Tailwind CSS 4 and
Radix UI. The charts are hand-drawn SVG and canvas, in light and dark themes. Page state lives in
the URL, so any view can be shared.

## Run it locally

```sh
bun install        # or npm install
bun run dev        # http://localhost:8080
bun run test       # checks every page's route
bun run build
```

## Shipping new models

Retrain and push in ML-Projects, then change the commit in `ENGINE_URL` in `src/lib/engine.ts`.
The old URL keeps working, so the live site never breaks mid-update.

## Data

- Rain: Rain in Australia (Kaggle), observations from the Australian Bureau of Meteorology. Live
  readings from [Open-Meteo](https://open-meteo.com).
- Fraud: Credit Card Fraud Detection (Kaggle), Worldline and the ULB Machine Learning Group.
- Insurance: Medical Cost Personal Datasets (Kaggle).
- Iris: R. A. Fisher (1936), as bundled with scikit-learn.

## License

MIT. See [LICENSE](LICENSE).
