import { createFileRoute } from "@tanstack/react-router";
import { ProjectPlaceholder } from "@/components/site/ProjectPlaceholder";
import { PROJECTS, pageTitle } from "@/lib/site";

const p = PROJECTS[1];
export const Route = createFileRoute("/fraud")({
  head: () => ({
    meta: [
      { title: pageTitle(p.title) },
      { name: "description", content: p.question },
      { property: "og:title", content: pageTitle(p.title) },
      { property: "og:description", content: p.question },
    ],
  }),
  component: () => <ProjectPlaceholder project={p} />,
});
