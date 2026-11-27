import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Tests de l'interface : navigateur simulé (jsdom), mêmes alias que Vite (@/…).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true, // describe, it, expect sans import, comme dans l'API
      setupFiles: ['./src/test/preparation.ts'],
      // Chaque test repart de zéro : simulations et fetch remplacé sont remis à l'état initial.
      clearMocks: true,
      restoreMocks: true,
      unstubGlobals: true,
    },
  }),
)
