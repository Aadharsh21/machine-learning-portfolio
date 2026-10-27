import { Link, useRouterState } from "@tanstack/react-router";
import { Github, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { REPO_URL } from "@/lib/engine";
import { PROJECTS } from "@/lib/site";
import { ACCENT_BG } from "./accent";
import { ThemeToggle } from "./ThemeToggle";

const linkCls =
  "inline-flex min-h-11 items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink-2 hover:text-ink data-[status=active]:text-ink data-[status=active]:font-semibold lg:min-h-0";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {PROJECTS.map((p) => (
        <Link key={p.slug} to={p.path} className={linkCls} onClick={onNavigate}>
          <span className={`h-2 w-2 rounded-full ${ACCENT_BG[p.accent]}`} aria-hidden />
          {p.nav}
        </Link>
      ))}
      <Link to="/how-it-works" className={linkCls} onClick={onNavigate}>
        How it works
      </Link>
      <a href={REPO_URL} className={linkCls} target="_blank" rel="noreferrer">
        <Github className="h-4 w-4" aria-hidden />
        Code
      </a>
    </>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="border-b border-rule">
      <div className="page-wrap flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex flex-col leading-none"
          aria-label="Aadharsh Arunn, machine learning projects: home"
        >
          <span className="font-condensed text-xl text-ink">Aadharsh Arunn</span>
          <span className="mt-1 text-xs text-ink-3">Machine learning projects</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink-2 hover:bg-surface lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="page-wrap flex flex-col gap-1 border-t border-rule py-3 lg:hidden"
        >
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </header>
  );
}
