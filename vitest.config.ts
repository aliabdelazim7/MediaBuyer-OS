import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The current suite covers the store, validation and formatting layers,
    // all of which are plain TypeScript with no DOM dependency. Add jsdom here
    // when component tests are introduced.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/lib/format.ts', 'src/lib/config.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
