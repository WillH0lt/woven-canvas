import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    conditions: ['@woven-canvas/source'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    projects: [
      path.resolve(__dirname, 'packages/vue'),
      {
        resolve: {
          conditions: ['@woven-canvas/source'],
        },
        test: {
          name: 'core',
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
          include: [path.resolve(__dirname, 'packages/*/__tests__/**/*.test.ts')],
          exclude: [path.resolve(__dirname, 'packages/vue/**')],
        },
      },
    ],
  },
})
