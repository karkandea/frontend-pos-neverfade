import {
  expect,
  test,
} from "@playwright/test";

import {
  e2eProductName,
  loginAsOwner,
} from "./helpers";

test.beforeEach(
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !==
        "Desktop Chromium",
      "Checkout mutation runs once on desktop."
    );

    await loginAsOwner(page);
  }
);

test(
  "owner can complete a QRIS checkout",
  async ({ page }) => {
    expect(
      e2eProductName,
      "QA_E2E_PRODUCT_NAME is required."
    ).not.toBe("");

    await page.goto("/kasir");

    await expect(
      page.getByRole("heading", {
        name: "Kasir",
        exact: true,
      })
    ).toBeVisible();

    const search =
      page.getByPlaceholder(
        "Cari produk atau scan barcode..."
      );

    await search.fill(e2eProductName);

    const productCard =
      page.locator(
        ".pos-product-card"
      ).filter({
        hasText: e2eProductName,
      });

    await expect(
      productCard
    ).toBeVisible();

    await productCard.click();

    await expect(
      page.locator(".cart-item")
    ).toContainText(e2eProductName);

    await page
      .locator(".payment-options")
      .getByRole("button", {
        name: "QRIS",
      })
      .click();

    const checkoutResponse =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith(
              "/api/transactions"
            ) &&
          response.request().method() ===
            "POST"
      );

    await page
      .getByRole("button", {
        name: "Proses Transaksi",
      })
      .click();

    expect(
      (await checkoutResponse).status()
    ).toBe(200);

    await expect(
      page.getByRole("heading", {
        name: "Preview Struk",
      })
    ).toBeVisible();

    await expect(
      page.locator(
        ".struk-container"
      )
    ).toContainText(e2eProductName);

    await expect(
      page.locator(
        ".struk-container"
      )
    ).toContainText(/TRX-\d{8}-\d+/);

    await page
      .getByRole("button", {
        name: "Tutup",
      })
      .click();

    await expect(
      page.getByText(
        "Keranjang kosong"
      )
    ).toBeVisible();
  }
);
