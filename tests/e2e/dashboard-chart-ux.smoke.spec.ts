import { expect, test, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

const user = { id: "owner-chart", nama: "Owner Chart", username: "owner", role: "owner" };
const chart = [
  { date: "2026-09-07", label: "Sen", total: 0 },
  { date: "2026-09-08", label: "Sel", total: 18000 },
  { date: "2026-09-09", label: "Rab", total: 36000 },
  { date: "2026-09-10", label: "Kam", total: 18000 },
  { date: "2026-09-11", label: "Jum", total: 27000 },
  { date: "2026-09-12", label: "Sab", total: 0 },
  { date: "2026-09-13", label: "Min", total: 72000 },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login") return json(route, { token: "owner-chart-token", user });
    if (path === "/api/auth/me") return json(route, user);
    if (path === "/api/laporan/summary") return json(route, { omzet: 72000, transaksi: 2, avg: 36000, pelanggan: 0 });
    if (path === "/api/laporan/top-products") return json(route, [{ nama: "Burger Beef Double", qty: 1, revenue: 42000 }]);
    if (path === "/api/laporan/chart") return json(route, chart);
    return json(route, []);
  });
  await mockTenantContext(page, "owner");
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/dashboard");
});

test("dashboard chart stays readable and interactive", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Total 7 hari")).toBeVisible();
  await expect(page.getByText(/171\.000/)).toBeVisible();

  const canvas = page.locator("#sales-chart");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(250);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(170);

  await canvas.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".sales-chart-selected")).toContainText("Sab");
  await expect(page.locator(".sales-chart-selected")).toContainText(/Rp\s?0/);

  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(size.document).toBeLessThanOrEqual(size.viewport + 1);
});
