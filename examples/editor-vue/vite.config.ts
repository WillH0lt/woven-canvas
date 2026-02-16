import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import fullReload from 'vite-plugin-full-reload'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

const monorepoRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    topLevelAwait(),
    fullReload(['packages/**/src/**/*.{ts,vue}'], {
      root: monorepoRoot,
      delay: 100,
    }),
  ],
  resolve: {
    conditions: ['@woven-canvas/source'],
  },
})
