import {
  expect,
  test,
  type Route,
} from "@playwright/test";

import {
  loginAsOwner,
} from "./helpers";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("Ingat saya controls persistent versus terminal-only session", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login") {
      return json(route, {
        token: "remember-token",
        user: { id: "user", nama: "Owner", username: "owner", role: "owner" },
      });
    }
    if (path === "/api/auth/me") {
      return json(route, { id: "user", nama: "Owner", username: "owner", role: "owner" });
    }
    return json(route, []);
  });
  await mockTenantContext(page);

  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  expect(await page.evaluate(() => localStorage.getItem("nfpos_token"))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem("nfpos_token"))).toBe("remember-token");

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.locator("label.checkbox-label").click();
  await expect(page.getByLabel("Ingat saya")).toBeChecked();
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  expect(await page.evaluate(() => localStorage.getItem("nfpos_token"))).toBe("remember-token");
  expect(await page.evaluate(() => sessionStorage.getItem("nfpos_token"))).toBeNull();
});

test("kasir login lands directly on Kasir with focused navigation", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const user = { id: "kasir", nama: "Kasir QA", username: "kasir", role: "kasir" };
    if (path === "/api/auth/login") return json(route, { token: "kasir-token", user });
    if (path === "/api/auth/me") return json(route, user);
    if (path === "/api/products" || path === "/api/customers") return json(route, []);
    if (path === "/api/settings") return json(route, { defaultTax: 0, headerStruk: "", footerStruk: "" });
    if (path === "/api/payments/capabilities") return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    return json(route, []);
  });
  await mockTenantContext(page, "kasir");
  await page.goto("/login");
  await page.getByLabel("Username").fill("kasir");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/kasir$/);
  await expect(page.getByRole("link", { name: "Kasir" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Transaksi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Produk" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Laporan" })).toHaveCount(0);
});

test(
  "unauthenticated user is redirected to login",
  async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(
      /\/login$/
    );

    await expect(
      page.locator("#login-username")
    ).toBeVisible();

    await expect(
      page.locator("#login-password")
    ).toBeVisible();

    await expect(
      page.locator("#btn-login")
    ).toBeEnabled();
  }
);

test(
  "owner can login and access protected routes",
  async ({ page }) => {
    await loginAsOwner(page);

    const routes = [
      ["/dashboard", "Dashboard"],
      ["/produk", "Produk"],
      ["/kasir", "Kasir"],
      ["/inventaris", "Inventaris"],
      ["/pelanggan", "Pelanggan"],
      ["/transaksi", "Transaksi"],
      ["/laporan", "Laporan"],
      ["/karyawan", "Karyawan"],
      ["/absensi", "Absensi"],
      ["/pengguna", "Pengguna"],
      ["/pengaturan", "Pengaturan"],
    ] as const;

    for (const [route, heading] of routes) {
      await page.goto(route);

      await expect(page).toHaveURL(
        new RegExp(`${route}$`)
      );

      await expect(
        page.getByRole("heading", {
          name: heading,
          exact: true,
        })
      ).toBeVisible();
    }
  }
);

test(
  "logout removes the authenticated session",
  async ({ page }) => {
    await loginAsOwner(page);

    await page.evaluate(() => {
      localStorage.setItem("nfpos_active_qris", "tenant-payment");
    });

    await page.locator("#btn-logout").click();

    await expect(page).toHaveURL(
      /\/login$/
    );

    expect(
      await page.evaluate(() => localStorage.getItem("nfpos_active_qris"))
    ).toBeNull();

    await page.goto("/dashboard");

    await expect(page).toHaveURL(
      /\/login$/
    );
  }
);

test(
  "advertised admin demo credential can login",
  async ({ page }) => {
    await page.goto("/login");

    await page
      .locator("#login-username")
      .fill("admin");

    await page
      .locator("#login-password")
      .fill("admin123");

    await page.locator("#btn-login").click();

    await expect(page).toHaveURL(
      /\/produk$/
    );
  }
);
