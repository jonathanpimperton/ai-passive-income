import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@lib': '/home/user/ai-passive-income/src/lib',
      '@components': '/home/user/ai-passive-income/src/components',
    },
  },
});
