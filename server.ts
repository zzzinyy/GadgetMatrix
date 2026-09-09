import { createStartHandler } from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-router/ssr/server";
import { createRouter } from "./src/router";

const handler = createStartHandler({
  createRouter,
  getRouterManifest,
});

export default {
  fetch: handler,
};
