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

let productOutletHeaders: Array<string | undefined> = [];

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
  productOutletHeaders = [];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/auth/login") {
      return json(route, { token: "owner-product-token", user });
    }
    if (path === "/api/auth/me") return json(route, user);
    if (path === "/api/outlets") return json(route, [
      { id: "outlet-main", code: "MAIN", name: "Utama", address: "", phone: "", isDefault: true, active: true },
      { id: "outlet-branch", code: "BR", name: "Cabang", address: "", phone: "", isDefault: false, active: true },
    ]);
    if (path === "/api/products") {
      productOutletHeaders.push(route.request().headers()["x-outlet-id"]);
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
  const desktopList = page.locator(".product-desktop-list");
  await expect(desktopList).toBeVisible();
  await expect(desktopList.getByText("Rp 42.000", { exact: true })).toBeVisible();
  await expect(desktopList.getByText("48 pcs", { exact: true })).toBeVisible();

  const toolbar = await page.locator(".product-toolbar").boundingBox();
  expect(toolbar?.height ?? 999).toBeLessThan(60);
});

test("mobile product management uses cards without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile Chromium", "Mobile product UX runs once.");

  const mobileList = page.locator(".product-mobile-list");
  await expect(mobileList).toBeVisible();
  await expect(page.locator(".product-desktop-list")).toBeHidden();
  await expect(mobileList.getByText("Burger Beef Double", { exact: true })).toBeVisible();
  await expect(mobileList.getByText("Rp 42.000", { exact: true })).toBeVisible();
  await expect(mobileList.getByText("48 pcs", { exact: true })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});


test("product catalog refetches for the selected outlet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Outlet header regression runs once.");

  await expect(page.getByLabel("Outlet aktif")).toBeVisible();
  productOutletHeaders = [];
  await page.getByLabel("Outlet aktif").selectOption("outlet-branch");

  await expect.poll(() => productOutletHeaders.at(-1)).toBe("outlet-branch");
});

test("catalog status changes serialize inactive flag without affecting other fields", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Desktop status management.");
  let serialized: Record<string, unknown> | null = null;
  await page.route("**/api/products/p-1", async (route) => {
    if (route.request().method() === "PUT") {
      serialized = route.request().postDataJSON() as Record<string, unknown>;
      return json(route, { ...products[0], active: false });
    }
    return route.continue();
  });
  const row = page.locator(".product-desktop-list tr").filter({ hasText: "Burger Beef Double" });
  await row.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Status penjualan")).toHaveValue("active");
  await page.getByLabel("Status penjualan").selectOption("inactive");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect.poll(() => serialized?.active).toBe(false);
  expect(serialized?.kode).toBe("PRD005");
  expect(serialized?.nama).toBe("Burger Beef Double");
});
