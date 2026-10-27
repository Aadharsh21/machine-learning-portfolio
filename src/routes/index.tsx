import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aadharsh Arunn: Machine learning projects" },
      { name: "description", content: "Machine learning projects by Aadharsh Arunn." },
      { property: "og:title", content: "Aadharsh Arunn: Machine learning projects" },
      { property: "og:description", content: "Machine learning projects by Aadharsh Arunn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Machine learning projects
      </h1>
    </main>
  );
}
