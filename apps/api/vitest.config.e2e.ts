import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Base Redis n° 15, réservée aux tests : ils peuvent la vider sans toucher à celle du développement.
    env: { REDIS_URL: 'redis://localhost:6379/15' },
  },
});
