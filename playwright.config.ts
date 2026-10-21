import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4173/',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
