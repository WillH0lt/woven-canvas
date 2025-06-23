import { defineConfig } from 'vitest/config'

export default defineConfig({
  optimizeDeps: {
    include: ['@lastolivegames/becsy/perf'],
  },
  test: {
    // environment: 'jsdom',
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          headless: true,
        },
      ],
    },
    globals: true,
  },
  plugins: [
    {
      name: 'replace',
      transform(code) {
        return code.replace(/@lastolivegames\/becsy/g, '@lastolivegames/becsy/perf')
      },
    },
  ],
  resolve: {
    conditions: ['@infinitecanvas/source'],
  },
})
