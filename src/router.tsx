import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    basepath: "/GadgetMatrix",
    // createHashHistory usa `window`: en SSR/prerender hay que usar memoria.
    history:
      typeof window !== "undefined"
        ? createHashHistory()
        : createMemoryHistory({ initialEntries: ["/GadgetMatrix/"] }),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
