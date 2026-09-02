import { expect, test, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("cashier login is usable at 320px and lands on Kasir", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile Chromium", "Mobile login runs once on touch project.");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const user = { id: "cashier-mobile", nama: "Kasir Mobile", username: "kasir", role: "kasir" };
    if (path === "/api/auth/login") return json(route, { token: "cashier-mobile-token", user });
    if (path === "/api/auth/me") return json(route, user);
    if (path === "/api/products" || path === "/api/customers") return json(route, []);
    if (path === "/api/settings") return json(route, { defaultTax: 0, headerStruk: "", footerStruk: "" });
    if (path === "/api/payments/capabilities") return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    if (path === "/api/payments/current") return route.fulfill({ status: 204, body: "" });
    return json(route, []);
  });
  await mockTenantContext(page, "kasir");

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  await page.getByLabel("Username").fill("kasir");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/kasir$/);
  await expect(page.getByRole("heading", { name: "Kasir", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigasi cepat" })).toBeVisible();

  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});
