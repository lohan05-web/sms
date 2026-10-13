import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'mysql://smartschool:test@localhost:3306/smartschool_test',
      JWT_ACCESS_SECRET: 'test_access_secret_at_least_32_characters_long_000',
      JWT_REFRESH_SECRET: 'test_refresh_secret_at_least_32_characters_long_000',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/dist/**', '**/tests/**', '**/prisma/**'],
    },
  },
});
