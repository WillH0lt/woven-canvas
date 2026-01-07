import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    conditions: ["@infinitecanvas/source"],
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "../../vitest.setup.ts")],
  },
});
