import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    basepath: "/GadgetMatrix",
    // Sin `history` personalizado: TanStack Start usa browser history en cliente
    // (compatible con prerender/SSR) y memoria en servidor. createHashHistory
    // rompía el prerender e inyectaba referencias dev (`/@id/virtual:...`).
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
