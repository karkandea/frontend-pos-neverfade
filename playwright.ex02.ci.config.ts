import { defineConfig, devices } from "@playwright/test";
import bundledChromium from "@sparticuz/chromium";

const executablePath = await bundledChromium.executablePath();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["ex02-mfa.spec.ts"],
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5273",
    launchOptions: { executablePath, args: bundledChromium.args },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5273 --strictPort",
    url: "http://127.0.0.1:5273/login",
    reuseExistingServer: false,
    timeout: 90_000,
  },
  projects: [{
    name: "Desktop Chromium",
    use: { ...devices["Desktop Chrome"], browserName: "chromium" },
  }],
});
