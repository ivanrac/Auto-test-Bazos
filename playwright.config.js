// playwright.config.js
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // --- ZVÝŠENÝ GLOBÁLNY TIMEOUT PRE CELÝ TEST ---
  // Navyšujeme na 180 sekúnd (3 minúty) na pokrytie troch pomalých sekvenčných scenárov.
  timeout: 180000, 
  // ---------------------------------------------

  use: {
    baseURL: 'https://www.bazos.sk/',
    trace: 'on-first-retry',
    // Nastavenie na nahrávanie videa pri zlyhaní
    video: 'on-first-retry',  
    screenshot: 'off',        
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});