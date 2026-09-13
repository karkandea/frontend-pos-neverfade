import {
  defineConfig,
  devices,
} from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://127.0.0.1:5273";

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: false,

  forbidOnly: true,

  retries: 0,

  workers: 1,

  timeout: 30_000,

  expect: {
    timeout: 8_000,
  },

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report",
        open: "never",
      },
    ],
    [
      "json",
      {
        outputFile:
          "../neverfade-pos-qa/playwright-result.json",
      },
    ],
  ],

  use: {
    baseURL,

    trace: "retain-on-failure",

    screenshot: "only-on-failure",

    video: "retain-on-failure",
  },

  projects: [
    {
      name: "Desktop Chromium",

      use: {
        ...devices["Desktop Chrome"],

        browserName: "chromium",

        viewport: {
          width: 1440,
          height: 1000,
        },
      },
    },

    {
      name: "Tablet Chromium",

      use: {
        browserName: "chromium",

        viewport: {
          width: 820,
          height: 1180,
        },

        hasTouch: true,
      },
    },

    {
      name: "Mobile Chromium",

      use: {
        browserName: "chromium",

        viewport: {
          width: 390,
          height: 844,
        },

        deviceScaleFactor: 3,

        isMobile: true,

        hasTouch: true,
      },
    },
  ],
});
