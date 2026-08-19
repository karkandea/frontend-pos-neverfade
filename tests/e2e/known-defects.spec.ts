import {
  expect,
  test,
} from "@playwright/test";

import {
  knownTransactionNumber,
  loginAsOwner,
} from "./helpers";

test.beforeEach(
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !==
        "Desktop Chromium",
      "Known defects are verified once on desktop."
    );

    await loginAsOwner(page);
  }
);

test(
  "users API is available for Pengguna page",
  async ({ page }) => {
    const responsePromise =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith("/api/users")
      );

    await page.goto("/pengguna");

    const response =
      await responsePromise;

    expect(response.status()).toBe(200);

    await expect(
      page.locator(".data-table")
    ).toBeVisible();
  }
);

test(
  "transaction history displays backend transactions",
  async ({ page }) => {
    expect(
      knownTransactionNumber,
      "Known transaction number is required."
    ).not.toBe("");

    await page.goto("/transaksi");

    await expect(
      page.locator(
        "#transaksi-tbody"
      )
    ).toContainText(
      knownTransactionNumber
    );
  }
);

test(
  "laporan page displays real report totals",
  async ({ page }) => {
    const summary =
      await page.evaluate(
        async () => {
          const token =
            localStorage.getItem(
              "nfpos_token"
            ) ?? sessionStorage.getItem(
              "nfpos_token"
            );

          const response =
            await fetch(
              "http://127.0.0.1:5012/api/laporan/summary?period=harian",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          return response.json();
        }
      );

    expect(
      Number(summary.omzet)
    ).toBeGreaterThan(0);

    await page.goto("/laporan");

    const summaryText =
      await page
        .locator("#laporan-summary")
        .innerText();

    expect(summaryText).not.toContain(
      "Rp 0"
    );

    expect(summaryText).not.toContain(
      "\n0\n"
    );
  }
);
