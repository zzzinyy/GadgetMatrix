import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/GadgetMatrix/",
    server: {
      // SEGURIDAD: el wrapper de Lovable usa host "::" por defecto, lo que expone el
      // servidor de desarrollo a toda la red local (LAN/WiFi). Lo forzamos a localhost
      // para que solo sea accesible desde este PC. Importante porque las server
      // functions del copiloto usan la service role key de Supabase (ignora RLS).
      host: "127.0.0.1",
    },
  },

  tanstackStart: {
    prerender: {
      enabled: true,
      crawlLinks: true,
      autoStaticPathsDiscovery: true,
      autoSubfolderIndex: true,
    },
  },
});
