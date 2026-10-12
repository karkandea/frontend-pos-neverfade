import { expect, test, type Page, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

type Summary = {
  omzet: number;
  transaksi: number;
  avg: number;
  pelanggan: number;
  costIncomplete?: boolean;
  estimatedGrossProfit?: number | null;
};

const owner = {
  id: "qa-profit-owner",
  nama: "QA Owner",
  username: "owner",
  role: "owner",
};

async function openReport(page: Page, summary: Summary) {
  const reply = (route: Route, data: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login")
      return reply(route, { token: "qa-owner-profit-token", user: owner });
    if (path === "/api/auth/me") return reply(route, owner);
    if (path === "/api/outlets") return reply(route, []);
    if (path === "/api/laporan/summary") return reply(route, summary);
    if (path === "/api/laporan/chart")
      return reply(route, [
        { date: "2026-10-12T08:00", label: "08.00", total: 250000 },
        { date: "2026-10-12T09:00", label: "09.00", total: 0 },
      ]);
    if (path === "/api/laporan/top-products") return reply(route, []);
    return reply(route, []);
  });

  await mockTenantContext(page, "owner");
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/laporan");
  await expect(page.getByRole("heading", { name: "Laporan", exact: true }))
    .toBeVisible();
  await expect(page.locator("#laporan-summary")).toContainText("Total Penjualan");
}

const base: Summary = {
  omzet: 250000,
  transaksi: 2,
  avg: 125000,
  pelanggan: 1,
};

test("CORE17 missing sale cost explicitly withholds gross profit", async ({ page }) => {
  await openReport(page, {
    ...base,
    costIncomplete: true,
    estimatedGrossProfit: null,
  });

  const profit = page.locator("#laporan-summary .summary-row")
    .filter({ hasText: "Estimasi laba kotor" });
  await expect(profit).toContainText("Belum dapat dihitung");
  await expect(profit).not.toContainText("Rp");
  await expect(page.getByText(/snapshot harga modal/)).toBeVisible();
});

test("CORE17 complete cost snapshot displays estimate with financial qualifier", async ({ page }) => {
  await openReport(page, {
    ...base,
    costIncomplete: false,
    estimatedGrossProfit: 100000,
  });

  const profit = page.locator("#laporan-summary .summary-row")
    .filter({ hasText: "Estimasi laba kotor" });
  await expect(profit).toContainText(/Rp\\s*100\\.000/);
  await expect(page.getByText(/bukan laba bersih akuntansi/)).toBeVisible();
});

test("CORE17 legacy backend without profit fields does not fabricate a zero", async ({ page }) => {
  await openReport(page, base);
  await expect(page.locator("#laporan-summary .summary-row")
    .filter({ hasText: "Estimasi laba kotor" })).toHaveCount(0);
});
