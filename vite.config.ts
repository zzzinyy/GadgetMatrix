```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/GadgetMatrix/",
  },
  tanstackStart: {
    prerender: {
      enabled: false,
    },
  },
});
```
