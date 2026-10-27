import { useRouterState } from "@tanstack/react-router";
import { PROJECTS } from "@/lib/site";

export function Footer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const project = PROJECTS.find((p) => p.path === path);
  const credits = project ? [project.credit] : path === "/" ? PROJECTS.map((p) => p.credit) : [];
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="page-wrap space-y-2 py-8 text-sm text-ink-3">
        <p className="text-ink-2">
          Built by Aadharsh Arunn. Models are trained in Python and run in your browser; nothing is sent to a server.
        </p>
        {credits.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </div>
    </footer>
  );
}
