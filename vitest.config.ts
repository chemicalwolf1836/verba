import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // jsdom gives us window + localStorage for the storage-backed modules
    environment: 'jsdom',
    // Vitest 4 exits 1 when no test files exist. This project has no tests yet
    // (Task 1 is scaffold-only), so without this the "npm test" gate fails
    // before any test code is written.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
