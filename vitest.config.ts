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
  // Default parallel execution with threads for speed
  // (Use vitest.stable.config.ts when you need the old single-threaded mode)
  // Increase timeouts to prevent premature teardown while Vite serves virtual modules
  testTimeout: 30000,
  hookTimeout: 30000,
  teardownTimeout: 30000,
  // Keep default fileParallelism (true) for better performance
    typecheck: {
      tsconfig: './tsconfig.test.json'
    }
  },
}) 