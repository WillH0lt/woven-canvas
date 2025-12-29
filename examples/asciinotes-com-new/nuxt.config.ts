import fullReload from "vite-plugin-full-reload";
import { defineNuxtConfig } from "nuxt/config";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  build: {
    transpile: ["trpc-nuxt"],
  },
  ssr: true,
  runtimeConfig: {
    stripeSecretKey: "",
    public: {
      baseUrl: "",
    },
  },
  app: {
    head: {
      viewport:
        "width=device-width, initial-scale=1.0, interactive-widget=resizes-content",
    },
  },
  modules: [
    "nuxt-vuefire",
    "@nuxt/ui",
    "@vueuse/nuxt",
    [
      "@pinia/nuxt",
      {
        autoImports: ["defineStore", "acceptHMRUpdate"],
      },
    ],
    "nuxt-emoji-picker",
  ],
  css: ["~/assets/css/main.css"],
  colorMode: {
    preference: "light", // or 'system' or 'dark'
  },
  imports: {
    dirs: ["~/stores"],
  },
  nitro: {
    prerender: {
      // these routes are not dependent on any data and can be prerendered
      // it's a good idea to pre render all routes that you can
      routes: [],
    },
  },
  vuefire: {
    emulators: {
      enabled: true,
    },
    auth: {
      enabled: true,
      sessionCookie: true,
      options: {
        disableWarnings: true,
      },
      host: "0.0.0.0",
    },

    firestore: { host: "0.0.0.0", port: 8081 },
    storage: { host: "0.0.0.0", port: 9199 },

    config: {
      apiKey: "AIzaSyAeRpC4mQun8IShZrtPb7CERg39pnuKC60",
      authDomain: "asciinotes-com.firebaseapp.com",
      projectId: "asciinotes-com",
      storageBucket: "asciinotes-com.firebasestorage.app",
      messagingSenderId: "220239188421",
      appId: "1:220239188421:web:0cccec4648f6718c4c7bac",
      measurementId: "G-M600PHRH1C",
    },
  },

  vite: {
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          verbatimModuleSyntax: false,
          useDefineForClassFields: false,
        },
      },
    },
    plugins: [
      fullReload(["../../packages/**/*", "app/components/Studio/View.vue"]),
      wasm(),
      topLevelAwait(),
    ],
  },
});
