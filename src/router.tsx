import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // fetch a page's code when a visitor hovers or focuses a link to it
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
