/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Ensure each test file has a fresh module context even in single worker
    isolate: true,
    // Auto-restore/clear mocks between tests to prevent leakage
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    // Stabilized settings for flaky environments (Windows CI, resource constrained)
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    },
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    typecheck: {
      tsconfig: './tsconfig.test.json'
    }
  },
})
