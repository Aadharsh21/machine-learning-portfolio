import type { ProjectInfo } from "@/lib/site";
import { PageIntro } from "./PageIntro";

export function ProjectPlaceholder({ project }: { project: ProjectInfo }) {
  return (
    <main className="page-wrap">
      <PageIntro
        title={project.title}
        lede={project.question}
        facts={project.facts}
        notebook={project.notebook}
        code={project.code}
      />
      <section className="border-t border-rule pt-8">
        <h2 className="font-condensed text-2xl text-ink">Coming next</h2>
        <p className="mt-2 max-w-2xl text-ink-2">
          The live model for this project is on its way. For now you can read the notebook and the model code.
        </p>
      </section>
    </main>
  );
}
