import {
  expect,
  test,
} from "@playwright/test";

import {
  loginAsOwner,
} from "./helpers";

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

    await page.locator("#btn-logout").click();

    await expect(page).toHaveURL(
      /\/login$/
    );

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
