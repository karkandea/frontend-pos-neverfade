import {
  expect,
  test,
} from "@playwright/test";

import {
  loginAsOwner,
} from "./helpers";

test.beforeEach(
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !==
        "Desktop Chromium",
      "Mutation tests run once on desktop."
    );

    await loginAsOwner(page);
  }
);

test(
  "product can be created edited searched and deleted",
  async ({ page }) => {
    const suffix = Date.now();

    const code =
      `E2E_${suffix}_PRODUCT`;

    const name =
      `E2E Product ${suffix}`;

    const updatedName =
      `${name} Updated`;

    await page.goto("/produk");

    await page
      .getByRole("button", {
        name: "Tambah",
        exact: true,
      })
      .click();

    const modal =
      page.locator(
        ".modal-overlay.open"
      );

    await expect(
      modal.getByRole("heading", {
        name: "Tambah Produk",
      })
    ).toBeVisible();

    await modal
      .locator('input[name="kode"]')
      .fill(code);

    await modal
      .locator('input[name="nama"]')
      .fill(name);

    await modal
      .locator('input[name="kategori"]')
      .fill("QA");

    await modal
      .locator(
        'input[name="hargaModal"]'
      )
      .fill("10000");

    await modal
      .locator(
        'input[name="hargaJual"]'
      )
      .fill("15000");

    await modal
      .locator('input[name="stok"]')
      .fill("5");

    await modal
      .locator('input[name="satuan"]')
      .fill("pcs");

    const createResponse =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith("/api/products") &&
          response.request().method() ===
            "POST"
      );

    await modal
      .getByRole("button", {
        name: "Simpan",
      })
      .click();

    expect(
      (await createResponse).status()
    ).toBe(200);

    const search =
      page.getByPlaceholder(
        "Cari produk..."
      );

    await search.fill(code);

    const row = page
      .locator("tbody tr")
      .filter({
        hasText: code,
      });

    await expect(row).toContainText(name);

    await row
      .getByRole("button", {
        name: "Edit",
      })
      .click();

    await expect(
      modal.getByRole("heading", {
        name: "Edit Produk",
      })
    ).toBeVisible();

    await modal
      .locator('input[name="nama"]')
      .fill(updatedName);

    const updateResponse =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/products/"
          ) &&
          response.request().method() ===
            "PUT"
      );

    await modal
      .getByRole("button", {
        name: "Simpan",
      })
      .click();

    expect(
      (await updateResponse).status()
    ).toBe(200);

    await expect(
      page
        .locator("tbody tr")
        .filter({
          hasText: code,
        })
    ).toContainText(updatedName);

    page.once(
      "dialog",
      async (dialog) => {
        expect(dialog.message()).toBe(
          "Hapus produk ini?"
        );

        await dialog.accept();
      }
    );

    const deleteResponse =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/products/"
          ) &&
          response.request().method() ===
            "DELETE"
      );

    await page
      .locator("tbody tr")
      .filter({
        hasText: code,
      })
      .getByRole("button", {
        name: "Hapus",
      })
      .click();

    expect(
      (await deleteResponse).status()
    ).toBe(200);

    await expect(
      page
        .locator("tbody tr")
        .filter({
          hasText: code,
        })
    ).toHaveCount(0);
  }
);

test(
  "customer can be created edited searched and deleted",
  async ({ page }) => {
    const suffix = Date.now();

    const name =
      `E2E Customer ${suffix}`;

    const updatedName =
      `${name} Updated`;

    const phone =
      `0812${String(suffix).slice(-8)}`;

    const email =
      `e2e-${suffix}@qa.local`;

    await page.goto("/pelanggan");

    await page
      .getByRole("button", {
        name: "Tambah",
        exact: true,
      })
      .click();

    const modal =
      page.locator(
        ".modal-overlay.open"
      );

    await expect(
      modal.getByRole("heading", {
        name: "Tambah Pelanggan",
      })
    ).toBeVisible();

    await modal
      .locator('input[name="nama"]')
      .fill(name);

    await modal
      .locator('input[name="hp"]')
      .fill(phone);

    await modal
      .locator('input[name="email"]')
      .fill(email);

    await modal
      .locator(
        'textarea[name="alamat"]'
      )
      .fill("E2E Temporary Address");

    const createResponse =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith("/api/customers") &&
          response.request().method() ===
            "POST"
      );

    await modal
      .getByRole("button", {
        name: "Simpan",
      })
      .click();

    expect(
      (await createResponse).status()
    ).toBe(200);

    const search =
      page.getByPlaceholder(
        "Cari pelanggan..."
      );

    await search.fill(name);

    const row = page
      .locator("tbody tr")
      .filter({
        hasText: email,
      });

    await expect(row).toContainText(name);

    await row
      .getByRole("button", {
        name: "Edit",
      })
      .click();

    await modal
      .locator('input[name="nama"]')
      .fill(updatedName);

    const updateResponse =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/customers/"
          ) &&
          response.request().method() ===
            "PUT"
      );

    await modal
      .getByRole("button", {
        name: "Simpan",
      })
      .click();

    expect(
      (await updateResponse).status()
    ).toBe(200);

    const searchResponse =
      page.waitForResponse(
        (response) => {
          const url =
            new URL(response.url());

          return (
            url.pathname ===
              "/api/customers" &&
            url.searchParams.get(
              "search"
            ) === updatedName &&
            response.request().method() ===
              "GET"
          );
        }
      );

    await search.fill(updatedName);
    await searchResponse;

    const updatedRow =
      page
        .locator("tbody tr")
        .filter({
          hasText: email,
        });

    await expect(
      updatedRow
    ).toContainText(updatedName);

    await expect(
      updatedRow
    ).toBeVisible();

    page.once(
      "dialog",
      async (dialog) => {
        expect(dialog.message()).toBe(
          "Hapus pelanggan ini?"
        );

        await dialog.accept();
      }
    );

    const [
      deleteResponse,
    ] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/customers/"
          ) &&
          response.request().method() ===
            "DELETE"
      ),

      updatedRow
        .getByRole("button", {
          name: "Hapus",
        })
        .click(),
    ]);

    expect(
      deleteResponse.status()
    ).toBe(200);

    await expect(
      page
        .locator("tbody tr")
        .filter({
          hasText: email,
        })
    ).toHaveCount(0);
  }
);
