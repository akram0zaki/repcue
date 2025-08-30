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
    // Align with stable settings to avoid race conditions on CI
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // Increase timeouts to prevent premature teardown while Vite serves virtual modules
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    // Env-flag to temporarily disable unit tests during manual QA cycles
    ...(process.env.SKIP_UNIT_TESTS === '1' ? {
      include: [],
      exclude: ['**/*'],
      passWithNoTests: true,
    } : {}),
    typecheck: {
      tsconfig: './tsconfig.test.json'
    }
  },
}) 