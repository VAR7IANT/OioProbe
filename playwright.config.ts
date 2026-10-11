import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [
    ["list"],
    ["json", { outputFile: "evidence/browser-results.json" }],
  ],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: [
    {
      command: "npm run dev:demo -w @oioprobe/theme -- --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -w @oioprobe/theme -- --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
    },
  ],
});
