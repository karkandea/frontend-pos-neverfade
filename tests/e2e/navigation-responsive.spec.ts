import { expect, test, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("mobile navigation opens, closes, and page title follows route", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => {
    sessionStorage.setItem("nfpos_token", "mobile-token");
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      return json(route, {
        id: "owner",
        nama: "Owner Mobile",
        username: "owner",
        role: "owner",
      });
    }
    return json(route, []);
  });
  await mockTenantContext(page);

  await page.goto("/dashboard");
  await expect(page).toHaveTitle("Dashboard · NeverFade POS");
  const sidebar = page.locator("#sidebar");
  await expect(sidebar).not.toHaveClass(/mobile-open/);
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await expect(sidebar).toHaveClass(/mobile-open/);
  await page.getByRole("button", { name: "Tutup navigasi" }).last().click();
  await expect(sidebar).not.toHaveClass(/mobile-open/);

  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page.getByRole("link", { name: "Kasir" }).click();
  await expect(page).toHaveURL(/\/kasir$/);
  await expect(page).toHaveTitle("Kasir · NeverFade POS");
  await expect(sidebar).not.toHaveClass(/mobile-open/);
});
