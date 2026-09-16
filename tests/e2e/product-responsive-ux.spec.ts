import { expect, test, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

const user = {
  id: "owner-product-ux",
  nama: "Owner Product UX",
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
    type: "goods",
    tracksStock: true,
    quantityPrecision: 0,
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
    type: "goods",
    tracksStock: true,
    quantityPrecision: 0,
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/auth/login") {
      return json(route, { token: "owner-product-token", user });
    }
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

    return json(route, []);
  });

  await mockTenantContext(page, "owner");
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/produk");
});

test("desktop product management keeps controls compact and readable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Desktop product UX runs once.");

  await expect(page.getByRole("heading", { name: "Produk", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Cari nama, kode, atau barcode")).toBeVisible();
  await expect(page.getByRole("button", { name: /Tambah Produk/ })).toBeVisible();
  await expect(page.locator(".product-desktop-list")).toBeVisible();
  await expect(page.getByText("Rp42.000")).toBeVisible();
  await expect(page.getByText("48 pcs")).toBeVisible();

  const toolbar = await page.locator(".product-toolbar").boundingBox();
  expect(toolbar?.height ?? 999).toBeLessThan(60);
});

test("mobile product management uses cards without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile Chromium", "Mobile product UX runs once.");

  await expect(page.locator(".product-mobile-list")).toBeVisible();
  await expect(page.locator(".product-desktop-list")).toBeHidden();
  await expect(page.getByText("Burger Beef Double", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp42.000", { exact: true })).toBeVisible();
  await expect(page.getByText("48 pcs", { exact: true })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});
