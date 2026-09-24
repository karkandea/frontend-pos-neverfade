import { expect, test, type Page, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

const transaction = {
  id: "11111111-1111-4111-8111-111111111111",
  noTrx: "TRX-20260924-0001",
  tanggal: "2026-09-24T02:00:00Z",
  kasir: "QA",
  customerId: null,
  customerNama: "",
  items: [],
  subtotal: 25000,
  disc: 0, tax: 0, discAmt: 0, taxAmt: 0,
  total: 25000, metodePembayaran: "tunai",
  dibayar: 25000, kembalian: 0,
  status: "paid", paymentStatus: null, paymentFailureCode: null,
};

function json(route: Route, data: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
}
async function setup(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("nfpos_token", "qa-token"));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return json(route, { id: "qa", nama: "QA", username: "qa", role: "owner" });
    if (path === "/api/transactions") return json(route, [transaction]);    return json(route, []);
  });
  await mockTenantContext(page);
}

test("business feedback export downloads a populated CSV in Chromium", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Download gate on Chromium.");
  await setup(page);
  await page.goto("/transaksi");
  await expect(page.locator("#transaksi-tbody")).toContainText(transaction.noTrx);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#btn-export-transaksi").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^transaksi-\d{4}-\d{2}-\d{2}\.csv$/);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  let csv = "";
  if (stream) for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain("No Transaksi");
  expect(csv).toContain(transaction.noTrx);
  expect(csv).toContain("25000");
});

test("business feedback export opens native file share on supported tablets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Mock native share once.");
  await page.addInitScript(() => {
    const state = window as typeof window & { __sharedFileName?: string };
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => { state.__sharedFileName = data.files?.[0]?.name; },
    });
  });
  await setup(page);
  await page.goto("/transaksi");
  await expect(page.locator("#transaksi-tbody")).toContainText(transaction.noTrx);
  await page.locator("#btn-export-transaksi").click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __sharedFileName?: string }).__sharedFileName)).toMatch(/^transaksi-.*\.csv$/);
});

test("business feedback report requests a chart for its selected period", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Report contract once.");
  await setup(page);
  await page.route("**/api/laporan/**", (route) => {
    const url = new URL(route.request().url());
    const period = url.searchParams.get("period");
    if (url.pathname.endsWith("/summary")) {
      return json(route, { omzet: 25000, transaksi: 1, avg: 25000, pelanggan: 0 });
    }
    if (url.pathname.endsWith("/top-products")) return json(route, []);
    if (url.pathname.endsWith("/chart")) {
      const count = period === "harian" ? 24 : period === "mingguan" ? 7 : 9;
      return json(route, Array.from({ length: count }, (_, i) => ({
        date: "2026-09-24", label: String(i), total: i === 0 ? 25000 : 0,
      })));
    }
    return json(route, []);
  });
  await page.goto("/laporan");
  await expect(page.getByRole("heading", { name: "Tren Penjualan Harian" })).toBeVisible();

  const weeklyChart = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/laporan/chart" && url.searchParams.get("period") === "mingguan";
  });
  await page.locator("#laporan-period").selectOption("mingguan");
  await page.locator("#btn-generate-laporan").click();
  const response = await weeklyChart;
  expect(response.status()).toBe(200);
  expect((await response.json()).length).toBe(7);
  await expect(page.getByRole("heading", { name: "Tren Penjualan Mingguan" })).toBeVisible();
});
