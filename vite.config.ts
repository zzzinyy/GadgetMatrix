import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  base: "/GadgetMatrix/",
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: false,
        failOnError: true,
      },
    }),
    viteReact(),
  ],
});
