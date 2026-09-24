import { expect, test, type Page, type Route } from "@playwright/test";
import { commonTenantCapabilities, mockTenantContext } from "./tenantContextFixture";

function json(route: Route, value: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
}
async function setup(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("nfpos_token", "phase02-test-token"));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return json(route, { id: "qa", nama: "QA", username: "qa", role: "owner" });
    if (path === "/api/laporan/summary") return json(route, { omzet: 100, transaksi: 1, avg: 100, pelanggan: 0 });
    if (path === "/api/laporan/chart") return json(route, [{ date: "2026-09-20", label: "20 Sep", total: 100 }]);
    if (path === "/api/laporan/top-products") return json(route, []);
    return json(route, []);
  });
  await mockTenantContext(page, "owner", [...commonTenantCapabilities, "table_orders", "kitchen_queue"]);
}

test("custom WIB date range is forwarded to every report endpoint", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Contract check runs once.");
  await setup(page);
  await page.goto("/laporan");
  await page.locator("#laporan-start-date").fill("2026-09-20");
  await page.locator("#laporan-end-date").fill("2026-09-24");
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/laporan/")) requests.push(url.pathname + url.search);
  });
  await page.locator("#btn-generate-laporan").click();
  await expect(page.getByRole("heading", { name: "Tren Penjualan Rentang Tanggal" })).toBeVisible();
  await expect(page.locator(".dashboard-side")).toContainText("2026-09-20 s.d. 2026-09-24");
  for (const endpoint of ["summary", "chart", "top-products"]) {
    expect(requests.some((raw) => raw.includes("/api/laporan/" + endpoint)
      && raw.includes("startDate=2026-09-20") && raw.includes("endDate=2026-09-24"))).toBe(true);
  }
  await page.locator("#laporan-start-date").fill("2026-09-25");
  await page.locator("#laporan-end-date").fill("2026-09-24");
  await page.locator("#btn-generate-laporan").click();
  await expect(page.getByRole("alert")).toContainText("Tanggal mulai");
});

test("Meja and Dapur show correct topbar titles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Navigation check once.");
  await setup(page);
  await page.goto("/meja");
  await expect(page.locator("#topbar-title")).toHaveText("Meja & Pesanan");
  await page.goto("/dapur");
  await expect(page.locator("#topbar-title")).toHaveText("Dapur");
});

test("transaction detail uses stacked item rows without a horizontal table", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Responsive detail checked once.");
  await setup(page);
  await page.route("**/api/transactions", (route) => json(route, [{
    id: "11111111-1111-4111-8111-111111111111",
    noTrx: "TRX-20260924-0001", tanggal: "2026-09-24T02:00:00Z",
    kasir: "QA", customerNama: "", customerId: null,
    items: [{ id: "item1", nama: "Produk dengan nama cukup panjang untuk menguji responsivitas", qty: 2, hargaJual: 15000, subtotal: 30000 }],
    subtotal: 30000, disc: 0, tax: 0, discAmt: 0, taxAmt: 0, total: 30000,
    metodePembayaran: "tunai", dibayar: 30000, kembalian: 0,
    status: "paid", paymentStatus: null, paymentFailureCode: null,
  }]));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transaksi");
  await page.locator("#transaksi-tbody").getByRole("button", { name: "Detail" }).click();
  const modal = page.locator(".modal-overlay.open");
  await expect(modal.locator(".transaction-detail-items")).toContainText("Produk dengan nama cukup panjang");
  await expect(modal.locator(".table-scroll")).toHaveCount(0);
  const widths = await modal.evaluate((node) => ({
    content: node.querySelector(".transaction-detail-items")?.scrollWidth ?? 0,
    available: node.querySelector(".transaction-detail-items")?.clientWidth ?? 0,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.available + 1);
});

test("receipt shows cashier and supports 58/80 mm print media", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Receipt print contract once.");
  await setup(page);
  const product = { id: "11111111-1111-4111-8111-111111111111", kode: "QA-01", nama: "Kopi", kategori: "QA", hargaJual: 25000, stok: 12 };
  let capturedNote = "";
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/tenant/context" || path === "/api/auth/me") return route.fallback();
    if (path === "/api/products") return json(route, [product]);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") return json(route, { defaultTax: 0, headerStruk: "Neverfade QA", footerStruk: "Terima kasih" });
    if (path === "/api/payments/capabilities") return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    if (path === "/api/payments/current") return route.fulfill({ status: 204, body: "" });
    if (path === "/api/transactions" && route.request().method() === "POST") {
      capturedNote = (route.request().postDataJSON() as { items: { note?: string }[] }).items[0]?.note ?? "";
      return json(route, {
      id: "22222222-2222-4222-8222-222222222222",
      noTrx: "TRX-20260924-0002", kasir: "Kasir QA",
      createdAt: "2026-09-24T02:00:00Z", subtotal: 25000, discAmt: 0,
      taxAmt: 0, total: 25000, dibayar: 25000, kembalian: 0,
      metodePembayaran: "tunai", items: [{ id: product.id, nama: "Kopi", qty: 1, hargaJual: 25000, subtotal: 25000 }],
      });
    }
    return json(route, []);
  });
  await page.goto("/kasir");
  await page.getByRole("button", { name: "Tambah Kopi ke keranjang" }).click();
  await page.getByRole("textbox", { name: "Catatan Kopi" }).fill("Tanpa gula");
  await page.locator("#cash-received").fill("25000");
  await page.getByRole("button", { name: "Proses Transaksi" }).click();
  expect(capturedNote).toBe("Tanpa gula");
  await page.getByRole("button", { name: "Lihat Struk" }).click();
  const receipt = page.locator(".struk-container");
  await expect(receipt).toContainText("Kasir: Kasir QA");
  await page.getByLabel("Ukuran kertas struk").selectOption("58");
  await expect(receipt).toHaveAttribute("data-paper-width", "58");
  await page.emulateMedia({ media: "print" });
  const print58 = await receipt.evaluate((node) => ({
    width: parseFloat(getComputedStyle(node).width),
    visible: getComputedStyle(node).visibility,
    rootDisplay: getComputedStyle(document.querySelector("#root")!).display,
  }));
  expect(print58.rootDisplay).not.toBe("none");
  expect(print58.visible).toBe("visible");
  expect(print58.width).toBeGreaterThan(175);
  await page.emulateMedia({ media: "screen" });
  await page.getByLabel("Ukuran kertas struk").selectOption("80");
  await page.emulateMedia({ media: "print" });
  const print80 = await receipt.evaluate((node) => parseFloat(getComputedStyle(node).width));
  expect(print80).toBeGreaterThan(print58.width);
});
