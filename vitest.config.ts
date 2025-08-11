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
  // Stabilize tests on Windows: avoid worker fetch timeouts and race conditions
  // - Use process-based pool instead of threads
  // - Run single-threaded to reduce Vite RPC contention
  pool: 'forks',
  minThreads: 1,
  maxThreads: 1,
  // Increase timeouts to prevent premature teardown while Vite serves virtual modules
  testTimeout: 30000,
  hookTimeout: 30000,
  teardownTimeout: 30000,
  // Execute tests sequentially to further reduce concurrency issues
  fileParallelism: false,
    typecheck: {
      tsconfig: './tsconfig.test.json'
    }
  },
}) 