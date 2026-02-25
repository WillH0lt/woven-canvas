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
      external: [
        'vue',
        '@woven-canvas/core',
        '@woven-canvas/math',
        '@woven-canvas/plugin-arrows',
        '@woven-canvas/plugin-canvas-controls',
        '@woven-canvas/plugin-eraser',
        '@woven-canvas/plugin-pen',
        '@woven-canvas/plugin-selection',
        '@woven-ecs/core',
        '@woven-ecs/canvas-store',
      ],
      output: {
        globals: {
          vue: 'Vue',
          '@woven-canvas/core': 'WovenCanvasCore',
          '@woven-canvas/math': 'WovenCanvasMath',
          '@woven-canvas/plugin-arrows': 'WovenCanvasPluginArrows',
          '@woven-canvas/plugin-canvas-controls': 'WovenCanvasPluginCanvasControls',
          '@woven-canvas/plugin-eraser': 'WovenCanvasPluginEraser',
          '@woven-canvas/plugin-pen': 'WovenCanvasPluginPen',
          '@woven-canvas/plugin-selection': 'WovenCanvasPluginSelection',
          '@woven-ecs/core': 'WovenEcsCore',
          '@woven-ecs/canvas-store': 'WovenEcsCanvasStore',
        },
      },
    },
  },
})
