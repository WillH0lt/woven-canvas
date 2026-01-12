import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import fullReload from "vite-plugin-full-reload";

const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    topLevelAwait(),
    fullReload(["packages/**/src/**/*.{ts,vue}"], {
      root: monorepoRoot,
      delay: 100,
    }),
  ],
  resolve: {
    conditions: ["@infinitecanvas/source"],
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
