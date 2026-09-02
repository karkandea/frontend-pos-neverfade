import { expect, test, type Route } from "@playwright/test";

type Tenant = {
  id: string;
  namaToko: string;
  slug: string;
  status: "active" | "suspended";
  businessType: "general_retail" | "food_beverage" | "laundry" | "salon_barbershop";
  capabilities: string[];
  owner: {
    id: string;
    nama: string;
    username: string;
    active: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

const commonCapabilities = [
  "core_pos",
  "inventory",
  "customers",
  "reports",
  "attendance",
  "finance_withdrawal",
];

const platformUser = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  nama: "Neverfade Platform Admin",
  username: "platform.admin",
  role: "superadmin",
};

const existingTenant: Tenant = {
  id: "11111111-1111-1111-1111-111111111111",
  namaToko: "Existing Tenant",
  slug: "existing-tenant",
  status: "active",
  businessType: "general_retail",
  capabilities: commonCapabilities,
  owner: {
    id: "22222222-2222-2222-2222-222222222222",
    nama: "Existing Owner",
    username: "existing.owner",
    active: true,
  },
  createdAt: "2026-08-10T08:00:00Z",
  updatedAt: "2026-08-10T08:00:00Z",
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("super admin provisions business mode, updates profile, and controls tenant lifecycle", async ({ page }) => {
  const tenants = [existingTenant];
  let createdTenant: Tenant | null = null;

  await page.addInitScript(() => {
    if (!localStorage.getItem("qa-platform-session-initialized")) {
      localStorage.setItem("qa-platform-session-initialized", "true");
      localStorage.setItem("nfpos_token", "existing-tenant-token");
    }
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/auth/me") {
      return json(route, {
        id: "tenant-owner-id",
        nama: "Existing Owner",
        username: "existing.owner",
        role: "owner",
      });
    }

    if (path === "/api/tenant/context") {
      const isNewTenant = request.headers().authorization === "Bearer new-tenant-token";
      return json(route, {
        tenantId: isNewTenant
          ? "33333333-3333-3333-3333-333333333333"
          : existingTenant.id,
        namaToko: isNewTenant ? "QA Platform Coffee" : existingTenant.namaToko,
        businessType: isNewTenant
          ? createdTenant?.businessType ?? "food_beverage"
          : "general_retail",
        capabilities: isNewTenant
          ? createdTenant?.capabilities ?? [...commonCapabilities, "table_orders", "kitchen_queue"]
          : commonCapabilities,
        role: "owner",
      });
    }

    if (path === "/api/platform/auth/login") {
      return json(route, {
        token: "platform-token",
        user: platformUser,
      });
    }

    if (path === "/api/platform/auth/me") {
      return json(route, platformUser);
    }

    if (path === "/api/platform/tenants" && request.method() === "GET") {
      return json(route, tenants);
    }

    if (path === "/api/platform/tenants" && request.method() === "POST") {
      const payload = request.postDataJSON() as {
        namaToko: string;
        businessType: Tenant["businessType"];
        owner: { nama: string; username: string };
      };
      expect(payload.businessType).toBe("food_beverage");
      createdTenant = {
        id: "33333333-3333-3333-3333-333333333333",
        namaToko: payload.namaToko,
        slug: "qa-platform-coffee",
        status: "active",
        businessType: payload.businessType,
        capabilities: [...commonCapabilities, "table_orders", "kitchen_queue"],
        owner: {
          id: "44444444-4444-4444-4444-444444444444",
          nama: payload.owner.nama,
          username: payload.owner.username,
          active: true,
        },
        createdAt: "2026-08-10T09:00:00Z",
        updatedAt: "2026-08-10T09:00:00Z",
      };
      tenants.unshift(createdTenant);
      return json(route, createdTenant);
    }

    if (
      createdTenant &&
      path === `/api/platform/tenants/${createdTenant.id}/business-profile` &&
      request.method() === "PUT"
    ) {
      const payload = request.postDataJSON() as {
        businessType: Tenant["businessType"];
      };
      expect(payload).toEqual({ businessType: "laundry" });
      createdTenant = {
        ...createdTenant,
        businessType: payload.businessType,
        capabilities: [...commonCapabilities, "work_orders"],
        updatedAt: "2026-08-10T09:30:00Z",
      };
      tenants[0] = createdTenant;
      return json(route, createdTenant);
    }

    if (createdTenant && path === `/api/platform/tenants/${createdTenant.id}`) {
      return json(route, createdTenant);
    }

    if (
      createdTenant &&
      path === `/api/platform/tenants/${createdTenant.id}/suspend`
    ) {
      createdTenant = {
        ...createdTenant,
        status: "suspended",
        updatedAt: "2026-08-10T10:00:00Z",
      };
      tenants[0] = createdTenant;
      return json(route, createdTenant);
    }

    if (
      createdTenant &&
      path === `/api/platform/tenants/${createdTenant.id}/activate`
    ) {
      createdTenant = {
        ...createdTenant,
        status: "active",
        updatedAt: "2026-08-10T11:00:00Z",
      };
      tenants[0] = createdTenant;
      return json(route, createdTenant);
    }

    if (path === "/api/auth/login") {
      if (createdTenant?.status === "suspended") {
        return json(
          route,
          {
            code: "TENANT_SUSPENDED",
            message: "Tenant sedang ditangguhkan.",
          },
          403
        );
      }

      return json(route, {
        token: "new-tenant-token",
        user: {
          id: createdTenant?.owner.id,
          nama: createdTenant?.owner.nama,
          username: createdTenant?.owner.username,
          role: "owner",
        },
      });
    }

    if (path === "/api/products") {
      if (createdTenant?.status === "suspended") {
        return json(
          route,
          {
            code: "TENANT_SUSPENDED",
            message: "Tenant sedang ditangguhkan.",
          },
          403
        );
      }

      return json(route, []);
    }

    return json(route, {});
  });

  await page.goto("/platform/login");
  await page.getByLabel("Username").fill("platform.admin");
  await page.locator("#platform-password").fill("PlatformPassword123!");
  await page.getByRole("button", { name: "Masuk ke Platform" }).click();

  await expect(page).toHaveURL(/\/platform\/tenants$/);
  await expect(page.getByRole("heading", { name: "Tenant" })).toBeVisible();
  await expect(page.getByText("Existing Tenant")).toBeVisible();

  await page.getByRole("link", { name: "Buat Tenant" }).first().click();
  await page.getByLabel("Nama Toko").fill("QA Platform Coffee");
  await page.getByLabel("Tipe Bisnis").selectOption("food_beverage");
  await expect(page.getByText("Pesanan meja", { exact: true })).toBeVisible();
  await expect(page.getByText("Antrean dapur", { exact: true })).toBeVisible();
  await page.getByLabel("Nama Owner").fill("QA Owner Platform");
  await page.getByLabel("Username", { exact: true }).fill("qa.platform.owner");
  await page.getByLabel("Password Awal").fill("OwnerPassword123!");
  await page.getByRole("button", { name: "Buat Tenant" }).click();

  await expect(page).toHaveURL(/33333333-3333-3333-3333-333333333333$/);
  await expect(page.getByRole("heading", { name: "QA Platform Coffee" })).toBeVisible();
  await expect(page.getByText("Tenant berhasil dibuat.")).toBeVisible();
  await expect(page.getByText("Restoran / Coffee Shop")).toBeVisible();
  await expect(page.getByText("qa.platform.owner")).toBeVisible();

  await page.getByLabel("Tipe Bisnis").selectOption("laundry");
  await page.getByRole("button", { name: "Simpan Tipe Bisnis" }).click();
  await expect(
    page.getByText("Tipe bisnis dan capability tenant berhasil diperbarui.")
  ).toBeVisible();
  const businessInfo = page.locator(".platform-detail-card").filter({
    hasText: "Informasi Bisnis",
  });
  await expect(businessInfo.getByText("Laundry", { exact: true })).toBeVisible();
  await expect(page.getByText("Pesanan kerja / laundry", { exact: true })).toBeVisible();
  await expect(page.getByText("Pesanan meja", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Suspend Tenant" }).click();
  await page.getByLabel("Alasan").fill("QA lifecycle verification");
  await page.getByRole("button", { name: "Ya, Suspend" }).click();
  await expect(page.getByText("Tenant berhasil ditangguhkan.")).toBeVisible();
  await expect(page.getByText("Ditangguhkan").first()).toBeVisible();

  await page.goto("/produk");
  await expect(page).toHaveURL(/\/login\?reason=suspended$/);
  await expect(page.getByText(/Tenant sedang ditangguhkan/)).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => localStorage.getItem("nfpos_platform_token"))
  ).toBe("platform-token");

  await page.goto("/platform/tenants/33333333-3333-3333-3333-333333333333");
  await page.getByRole("button", { name: "Aktifkan Tenant" }).click();
  await page.getByRole("button", { name: "Ya, Aktifkan" }).click();
  await expect(page.getByText("Tenant berhasil diaktifkan.")).toBeVisible();

  await page.goto("/login");
  await page.locator("#login-username").fill("qa.platform.owner");
  await page.locator("#login-password").fill("OwnerPassword123!");
  await page.locator("#btn-login").click();
  await expect(page).toHaveURL(/\/produk$/);
  await expect(page.getByRole("heading", { name: "Produk" })).toBeVisible();
});
