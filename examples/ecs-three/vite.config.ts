import { defineConfig } from "vite";

export default defineConfig({
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
