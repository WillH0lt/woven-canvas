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
          // Pin the root so test discovery works no matter which directory
          // vitest is invoked from (package scripts run it from the package
          // dir, which otherwise silently skips that package's own tests).
          root: __dirname,
          // Globs must use forward slashes — backslashes from a Windows
          // path.resolve are treated as escapes and match nothing.
          include: [path.resolve(__dirname, 'packages/*/__tests__/**/*.test.ts').replace(/\\/g, '/')],
          exclude: [path.resolve(__dirname, 'packages/vue/**').replace(/\\/g, '/')],
        },
      },
    ],
  },
})
