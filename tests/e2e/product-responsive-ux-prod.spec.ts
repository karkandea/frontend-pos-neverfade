import { expect, test, type Route } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const user = {
  id: "owner-product-ux",
  nama: "Administrator",
  username: "owner",
  role: "owner",
};

const products = [
  {
    id: "p-1",
    kode: "PRD005",
    barcode: "899999000005",
    nama: "Burger Beef Double",
    kategori: "Burger",
    hargaModal: 25000,
    hargaJual: 42000,
    stok: 48,
    supplier: "",
    satuan: "pcs",
    deskripsi: "",
  },
  {
    id: "p-2",
    kode: "PRD010",
    barcode: "",
    nama: "Es Jeruk Peras",
    kategori: "Minuman",
    hargaModal: 4000,
    hargaJual: 10000,
    stok: 150,
    supplier: "",
    satuan: "gelas",
    deskripsi: "",
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/auth/login") return json(route, { token: "product-ux-token", user });
    if (path === "/api/auth/me") return json(route, user);
    if (path === "/api/products") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const kategori = url.searchParams.get("kategori") ?? "";
      const filtered = products.filter((product) => {
        const matchesSearch = !search || [product.nama, product.kode, product.barcode]
          .some((value) => value.toLowerCase().includes(search));
        const matchesCategory = !kategori || product.kategori === kategori;
        return matchesSearch && matchesCategory;
      });
      return json(route, filtered);
    }
    if (path === "/api/settings") {
      return json(route, { defaultTax: 0, headerStruk: "", footerStruk: "" });
    }
    if (path === "/api/payments/capabilities") {
      return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    }
    if (path === "/api/payments/current") return route.fulfill({ status: 204, body: "" });
    return json(route, []);
  });

  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
});

test("desktop product page is compact and readable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Desktop-only assertion.");

  await expect(page.getByRole("heading", { name: "Produk", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Cari nama, kode, atau barcode")).toBeVisible();
  await expect(page.getByRole("button", { name: /Tambah Produk/ })).toBeVisible();
  await expect(page.locator(".product-desktop-list")).toBeVisible();
  await expect(page.locator(".product-mobile-list")).toBeHidden();
  await expect(page.locator(".product-desktop-list").getByText(/Rp\s?42\.000/)).toBeVisible();
  await expect(page.locator(".product-desktop-list").getByText("48 pcs", { exact: true })).toBeVisible();

  const toolbar = await page.locator(".product-toolbar").boundingBox();
  expect(toolbar?.height ?? 999).toBeLessThan(60);
  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});

test("mobile and tablet product pages use cards without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "Desktop Chromium", "Responsive assertion runs on touch projects.");

  await expect(page.locator(".product-mobile-list")).toBeVisible();
  await expect(page.locator(".product-desktop-list")).toBeHidden();
  await expect(page.locator(".product-mobile-list").getByText("Burger Beef Double", { exact: true })).toBeVisible();
  await expect(page.locator(".product-mobile-list").getByText(/Rp\s?42\.000/)).toBeVisible();
  await expect(page.locator(".product-mobile-list").getByText("48 pcs", { exact: true })).toBeVisible();

  const addButton = await page.getByRole("button", { name: /Tambah Produk/ }).boundingBox();
  const toolbar = await page.locator(".product-toolbar").boundingBox();
  expect(addButton?.width ?? 0).toBeGreaterThan((toolbar?.width ?? 0) * 0.9);

  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});
