import { defineConfig, devices } from '@playwright/test';

/**
 * Both apps are tested against their production single-file build served by
 * `vite preview`, so the smoke tests exercise exactly the artefact that is delivered.
 * Run `npm run build` first (or `npm run e2e`, which does it for you).
 */
export default defineConfig({
  testDir: '.',
  testMatch: /apps\/[^/]+\/e2e\/.*\.e2e\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'] },
  projects: [
    {
      name: 'svg-pet',
      testMatch: /apps\/svg-pet\/e2e\/.*\.e2e\.spec\.ts$/,
      use: { baseURL: 'http://127.0.0.1:4321' },
    },
    {
      name: 'pixi-pet',
      testMatch: /apps\/pixi-pet\/e2e\/.*\.e2e\.spec\.ts$/,
      use: { baseURL: 'http://127.0.0.1:4322' },
    },
  ],
  webServer: [
    {
      command: 'npm run preview -w @pandalingo/svg-pet',
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run preview -w @pandalingo/pixi-pet',
      url: 'http://127.0.0.1:4322',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
