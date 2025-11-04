import { URL, fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import fullReload from 'vite-plugin-full-reload'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), fullReload(['./src/App.vue', './src/extensions/**/*'])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    conditions: ['@infinitecanvas/source'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild', // Ensure esbuild is used for minification
  },
  esbuild: {
    keepNames: true, // This option tells esbuild to preserve function and class names
  },
})
