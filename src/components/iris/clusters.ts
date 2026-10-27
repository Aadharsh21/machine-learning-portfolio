import type { IrisView } from "@/lib/engine";

export type ViewKey = "pca" | "petals" | "sepals" | "lengths";
export const VIEWS: Record<ViewKey, IrisView> = {
  pca: "pca",
  petals: [2, 3],
  sepals: [0, 1],
  lengths: [2, 0],
};
export const VIEW_LABEL: Record<ViewKey, string> = {
  pca: "Principal components",
  petals: "Petal length × petal width",
  sepals: "Sepal length × sepal width",
  lengths: "Petal length × sepal length",
};

export const SPECIES_SHAPE = ["circle", "square", "triangle"] as const;
export type Shape = (typeof SPECIES_SHAPE)[number];

/** "petal_length" -> "Petal length" */
export const featureLabel = (f: string) => {
  const s = f.replace("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A colour per cluster that follows what the cluster found, not its index: a cluster
 * matched to a species takes that species' slot (1 to 3), the rest take slots 4 onward.
 */
export function clusterColors(mapping: number[], k: number): string[] {
  const colors = new Array<string>(k).fill("");
  mapping.forEach((c, s) => {
    if (c >= 0 && c < k) colors[c] = `var(--series-${s + 1})`;
  });
  let next = 4;
  for (let c = 0; c < k; c++) if (!colors[c]) colors[c] = `var(--series-${next++})`;
  return colors;
}

/** An SVG path for a marker of the given shape, centred on (x, y). */
export function markerPath(shape: Shape, x: number, y: number, r: number): string {
  if (shape === "square") {
    const s = r * 0.9;
    return `M${x - s},${y - s}h${2 * s}v${2 * s}h${-2 * s}Z`;
  }
  if (shape === "triangle") {
    const s = r * 1.25;
    return `M${x},${y - s}L${x + s * 0.94},${y + s * 0.62}L${x - s * 0.94},${y + s * 0.62}Z`;
  }
  return `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
}

/** Starts tried when keeping the best: as many as the published runs used. */
export const restartsFor = (method: "kmeans" | "gmm") => (method === "kmeans" ? 20 : 10);
