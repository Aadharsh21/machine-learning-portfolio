<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Models run only through src/lib/engine.ts (pinned CDN engine) and pages load them via src/hooks/useProject.ts; never reimplement or hard-code model output.
- Theme: tokens live in src/styles.css; preference is stored in localStorage and applied by a pre-hydration script plus src/lib/theme.ts (useScheme for SVG/canvas), so there is no flash.
- Project metadata (titles, links, published v1/v2 results, credits) lives in src/lib/site.ts so nav, cards, intros and footer stay consistent.
- Shared UI pieces live in src/components/site/; accent classes are literal maps in accent.ts so Tailwind keeps them.
