import { defineConfig, devices } from "@playwright/test";
import bundledChromium from "@sparticuz/chromium";

const executablePath = await bundledChromium.executablePath();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["ex02-ops-attention.spec.ts"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5273",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath,
      args: bundledChromium.args,
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5273 --strictPort",
    url: "http://127.0.0.1:5273/login",
    reuseExistingServer: false,
    timeout: 90_000,
  },
  projects: [
    {
      name: "Desktop Chromium",
      use: { ...devices["Desktop Chrome"], browserName: "chromium" },
    },
  ],
});
