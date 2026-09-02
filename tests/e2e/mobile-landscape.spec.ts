import { expect, test, type Page, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

const product = { id: "landscape-product", kode: "LAND-001", nama: "Produk Landscape", kategori: "QA", hargaJual: 25000, stok: 10 };

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function setup(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("nfpos_token", "landscape-token"));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return json(route, { id: "owner", nama: "Owner Landscape", username: "owner", role: "owner" });
    if (path === "/api/products") return json(route, [product]);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") return json(route, { defaultTax: 0, headerStruk: "", footerStruk: "" });
    if (path === "/api/payments/capabilities") return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    if (path === "/api/payments/current") return route.fulfill({ status: 204, body: "" });
    return json(route, []);
  });
  await mockTenantContext(page);
}

for (const viewport of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
  test(`cashier phone landscape ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chromium", "Landscape matrix runs once.");
    await page.setViewportSize(viewport);
    await setup(page);
    await page.goto("/kasir");

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).not.toHaveClass(/mobile-open/);
    await expect(sidebar).not.toBeInViewport();
    await expect(page.getByRole("navigation", { name: "Navigasi cepat" })).toBeVisible();

    await page.getByRole("button", { name: "Buka menu lainnya" }).click();
    await expect(sidebar).toHaveClass(/mobile-open/);
    await expect(sidebar).toBeInViewport();
    await expect(page.getByRole("navigation", { name: "Navigasi cepat" })).toHaveCount(0);
    await sidebar.getByRole("button", { name: "Tutup navigasi" }).click();
    await expect(sidebar).not.toHaveClass(/mobile-open/);
    await expect(page.getByRole("navigation", { name: "Navigasi cepat" })).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Cari produk atau barcode" })).toBeVisible();
    await page.getByRole("button", { name: `Tambah ${product.nama} ke keranjang` }).click();
    const dock = page.getByRole("button", { name: /Buka keranjang/ });
    await expect(dock).toBeVisible();
    await dock.click();
    await expect(page.getByRole("dialog", { name: "Keranjang transaksi" })).toBeVisible();

    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });
}
