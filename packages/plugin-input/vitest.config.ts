import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    conditions: ['@infinitecanvas/source'],
    alias: {
      '@infinitecanvas/editor': path.resolve(__dirname, '../editor/src/index.ts'),
      '@infinitecanvas/ecs': path.resolve(__dirname, '../ecs/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
