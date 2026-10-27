import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { OG_IMAGE, SITE_NAME } from "@/lib/site";
import { themeBootScript } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <main className="page-wrap py-24">
      <p className="tabular text-sm text-ink-3">404</p>
      <h1 className="mt-2 font-condensed text-5xl text-ink">This page isn't here</h1>
      <p className="mt-4 max-w-xl font-serif text-xl text-ink-2">
        The link may be old or mistyped. The four projects are all on the home page.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-page hover:opacity-90"
      >
        Go to the home page
      </Link>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main className="page-wrap py-24">
      <h1 className="font-condensed text-4xl text-ink">This page didn't load</h1>
      <p className="mt-2 text-ink-2">Something went wrong. You can try again or head back home.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-page"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-sm border border-rule-strong px-4 py-2 text-sm font-semibold text-ink"
        >
          Go home
        </a>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Machine learning projects · Aadharsh Arunn" },
      {
        name: "description",
        content: "Machine learning projects by Aadharsh Arunn, running live in your browser.",
      },
      { name: "author", content: "Aadharsh Arunn" },
      { property: "og:title", content: "Machine learning projects · Aadharsh Arunn" },
      {
        property: "og:description",
        content: "Machine learning projects by Aadharsh Arunn, running live in your browser.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Machine learning projects by Aadharsh Arunn, with four coloured dots for the four projects",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0c1421", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [{ children: themeBootScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-page focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div id="main" className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}
