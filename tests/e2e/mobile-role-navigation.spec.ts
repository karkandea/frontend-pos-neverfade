import { expect, test, type Page, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function setupRole(page: Page, role: "kasir" | "owner" | "admin") {
  await page.addInitScript((tokenRole) => {
    sessionStorage.setItem("nfpos_token", `mobile-${tokenRole}-token`);
  }, role);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      return json(route, { id: role, nama: `${role} Mobile`, username: role, role });
    }
    if (path === "/api/transactions") return json(route, []);
    return json(route, []);
  });
  await mockTenantContext(page, role);
}

for (const role of ["kasir", "owner", "admin"] as const) {
  test(`mobile navigation hierarchy for ${role}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile Chromium", "Role hierarchy runs once on touch mobile.");
    await page.setViewportSize({ width: 390, height: 844 });
    await setupRole(page, role);
    await page.goto("/transaksi");

    const nav = page.getByRole("navigation", { name: "Navigasi cepat" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Kasir" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Transaksi" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Buka menu lainnya" })).toBeVisible();

    if (role === "owner") {
      await expect(nav.getByRole("link", { name: "Keuangan" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    } else if (role === "admin") {
      await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Keuangan" })).toHaveCount(0);
    } else {
      await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
      await expect(nav.getByRole("link", { name: "Keuangan" })).toHaveCount(0);
    }

    await nav.getByRole("button", { name: "Buka menu lainnya" }).click();
    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toHaveClass(/mobile-open/);

    if (role === "kasir") {
      await expect(sidebar.getByRole("link", { name: "Produk" })).toHaveCount(0);
      await expect(sidebar.getByRole("link", { name: "Laporan" })).toHaveCount(0);
    } else {
      await expect(sidebar.getByRole("link", { name: "Produk" })).toBeVisible();
    }
  });
}
