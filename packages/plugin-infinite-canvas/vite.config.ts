import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/vue/index.ts"),
      name: "InfiniteCanvasVue",
      fileName: "vue",
      formats: ["es", "cjs"],
    },
    outDir: "build",
    emptyOutDir: false, // Don't delete tsup output
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue",
        },
      },
    },
  },
});
