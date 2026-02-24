import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'build',
    copyPublicDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'vue',
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', '@woven-canvas/core', '@woven-canvas/math', '@woven-ecs/core', '@woven-ecs/canvas-store'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})
