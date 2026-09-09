```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/GadgetMatrix/",
  },

  tanstackStart: {
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/_shell.html",
        crawlLinks: false,
        retryCount: 0,
      },
    },
  },
});
```
