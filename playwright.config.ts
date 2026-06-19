import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    viewport: { width: 1280, height: 900 },
    actionTimeout: 5000,
  },
  webServer: {
    command: 'npx vite --host 0.0.0.0 --port 5174',
    port: 5174,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
