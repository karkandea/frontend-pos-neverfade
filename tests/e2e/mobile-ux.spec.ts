import { expect, test, type Page, type Route } from "@playwright/test";

const product = {
  id: "mobile-product-1",
  kode: "MOBILE-001",
  barcode: "899000000099",
  nama: "Burger Mobile QA",
  kategori: "Makanan",
  hargaJual: 42000,
  stok: 20,
};

const viewports = [
  { width: 320, height: 568, label: "320x568" },
  { width: 360, height: 640, label: "360x640" },
  { width: 375, height: 667, label: "375x667" },
  { width: 390, height: 844, label: "390x844" },
  { width: 412, height: 915, label: "412x915" },
  { width: 430, height: 932, label: "430x932" },
] as const;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function setupKasir(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("nfpos_token", "mobile-owner-token");
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/auth/me") {
      return json(route, {
        id: "mobile-owner",
        nama: "Owner Mobile QA",
        username: "owner.mobile",
        role: "owner",
      });
    }

    if (path === "/api/products") {
      return json(route, [product]);
    }

    if (path === "/api/customers") {
      return json(route, []);
    }

    if (path === "/api/settings") {
      return json(route, {
        defaultTax: 0,
        headerStruk: "NeverFade Mobile QA",
        footerStruk: "Terima kasih",
      });
    }

    if (path === "/api/payments/capabilities") {
      return json(route, {
        qrisEnabled: false,
        mode: "disabled",
        isSandbox: false,
      });
    }

    if (path === "/api/payments/current") {
      return route.fulfill({ status: 204, body: "" });
    }

    if (path === "/api/transactions" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      return json(route, {
        id: "mobile-transaction-1",
        createdAt: "2026-08-23T10:00:00Z",
        noTrx: "TRX-MOBILE-001",
        subtotal: payload.subtotal,
        discAmt: payload.discAmt,
        taxAmt: payload.taxAmt,
        total: payload.total,
        dibayar: payload.dibayar,
        kembalian: payload.kembalian,
        metodePembayaran: payload.metodePembayaran,
        items: payload.items,
      });
    }

    return json(route, []);
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewport + 1);
}

for (const viewport of viewports) {
  test(`cashier mobile layout ${viewport.label}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chromium", "Viewport matrix runs once.");
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await setupKasir(page);
    await page.goto("/kasir");

    await expect(page.getByRole("heading", { name: "Kasir", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigasi cepat" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const search = page.getByRole("textbox", { name: "Cari produk atau barcode" });
    await expect(search).toBeVisible();
    await expect(search).not.toBeFocused();

    const card = page.locator(".pos-product-card", { hasText: product.nama });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: `Tambah ${product.nama} ke keranjang` }).click();

    const dock = page.getByRole("button", { name: /Buka keranjang/ });
    await expect(dock).toBeVisible();
    await expect(dock).toContainText("Rp42.000");
    await assertNoHorizontalOverflow(page);

    await dock.click();
    const cart = page.getByRole("dialog", { name: "Keranjang transaksi" });
    await expect(cart).toBeVisible();
    await expect(cart.getByText(product.nama)).toBeVisible();

    for (const control of [
      cart.getByRole("button", { name: `Kurangi ${product.nama}` }),
      cart.getByRole("button", { name: `Tambah ${product.nama}` }),
      cart.getByRole("button", { name: `Hapus ${product.nama} dari keranjang` }),
    ]) {
      const box = await control.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }

    await cart.getByRole("button", { name: "Tutup keranjang" }).click();
    await expect(cart).toBeHidden();
  });
}

test("cashier completes a cash sale from the mobile cart sheet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile Chromium", "Full touch flow runs on mobile project.");
  await page.setViewportSize({ width: 390, height: 844 });
  await setupKasir(page);
  await page.goto("/kasir");

  await page.getByRole("button", { name: `Tambah ${product.nama} ke keranjang` }).click();
  await page.getByRole("button", { name: /Buka keranjang/ }).click();

  const cart = page.getByRole("dialog", { name: "Keranjang transaksi" });
  await cart.getByRole("button", { name: "Uang Pas" }).click();
  const checkout = cart.getByRole("button", { name: /Proses Transaksi/ });
  await expect(checkout).toBeEnabled();
  await checkout.click();

  const success = page.getByRole("dialog", { name: "Transaksi Berhasil" });
  await expect(success).toBeVisible();
  await expect(success).toContainText("TRX-MOBILE-001");
  await success.getByRole("button", { name: "Transaksi Baru" }).click();
  await expect(page.getByRole("button", { name: /Buka keranjang/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Kasir", exact: true })).toBeVisible();
});
