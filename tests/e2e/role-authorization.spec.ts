import {
  expect,
  test,
  type Page,
} from "@playwright/test";

async function login(
  page: Page,
  username: string,
  password: string
) {
  await page.goto("/login");

  await expect(
    page.locator("#login-username")
  ).toBeVisible();

  await page
    .locator("#login-username")
    .fill(username);

  await page
    .locator("#login-password")
    .fill(password);

  await Promise.all([
    page.waitForURL(username === "kasir" ? "**/kasir" : "**/produk"),

    page.locator("#btn-login").click(),
  ]);

  await expect(page.getByRole("heading", {
    name: username === "kasir" ? "Kasir" : "Produk",
    exact: true,
  })).toBeVisible();
}

test(
  "admin can access admin-only pages",
  async ({ page }) => {
    await login(
      page,
      "admin",
      "admin123"
    );

    await expect(
      page.locator("#user-role")
    ).toHaveText("admin");

    const routes = [
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
  "kasir cannot access admin-only pages",
  async ({ page }) => {
    await login(
      page,
      "kasir",
      "kasir123"
    );

    await expect(
      page.locator("#user-role")
    ).toHaveText("kasir");

    await expect(
      page.getByRole("link", {
        name: "Karyawan",
        exact: true,
      })
    ).toHaveCount(0);

    await expect(
      page.getByRole("link", {
        name: "Absensi",
        exact: true,
      })
    ).toHaveCount(0);

    await expect(
      page.getByRole("link", {
        name: "Pengguna",
        exact: true,
      })
    ).toHaveCount(0);

    await expect(
      page.getByRole("link", {
        name: "Pengaturan",
        exact: true,
      })
    ).toHaveCount(0);

    const blockedRoutes = [
      "/karyawan",
      "/absensi",
      "/pengguna",
      "/pengaturan",
    ];

    for (const route of blockedRoutes) {
      await page.goto(route);

      await expect(page).toHaveURL(
        /\/dashboard$/
      );

      await expect(
        page.getByRole("heading", {
          name: "Dashboard",
          exact: true,
        })
      ).toBeVisible();
    }

    const allowedRoutes = [
      ["/kasir", "Kasir"],
      ["/produk", "Produk"],
      ["/pelanggan", "Pelanggan"],
      ["/transaksi", "Transaksi"],
      ["/laporan", "Laporan"],
    ] as const;

    for (const [route, heading] of allowedRoutes) {
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
