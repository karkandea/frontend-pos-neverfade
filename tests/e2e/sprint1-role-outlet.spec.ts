import { expect, test, type Page, type Route } from "@playwright/test";

const cashierId = "22222222-2222-2222-2222-222222222222";
const mainId = "33333333-3333-3333-3333-333333333333";
const branchId = "44444444-4444-4444-4444-444444444444";

function respond(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function session(page: Page, role: "owner" | "kasir" | "dapur", fnb = false) {
  await page.addInitScript(() => localStorage.setItem("nfpos_token", "s1-test-token"));
  const user = {
    id: role === "owner" ? "11111111-1111-1111-1111-111111111111" : cashierId,
    nama: role === "owner" ? "Owner QA" : "Kasir QA", username: role, role,
  };
  await page.route("**/api/auth/me", (route) => respond(route, user));
  await page.route("**/api/tenant/context", (route) => respond(route, {
    tenantId: "99999999-9999-9999-9999-999999999999",
    namaToko: "S1 QA", businessType: fnb ? "food_beverage" : "general_retail",
    capabilities: ["core_pos", "inventory", "customers", "reports", "attendance", "finance_withdrawal",
      ...(fnb ? ["table_orders", "kitchen_queue"] : [])],
    role, tenantStatus: "active", assignedOutletIds: [mainId],
    effectivePermissions: role === "owner"
      ? ["users.manage", "restaurant.tables.read", "restaurant.tables.manage", "pos.sell", "reports.read"]
      : role === "dapur" ? ["outlets.read", "restaurant.kitchen.operate"] : ["restaurant.tables.read", "pos.sell"],
  }));
}

test("owner assigns and revokes staff outlet from user management", async ({ page }) => {
  await session(page, "owner");
  let submitted: unknown = null;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    if (path === "/api/outlets") return respond(route, [
      { id: mainId, name: "Utama", active: true, isDefault: true },
      { id: branchId, name: "Cabang Dua", active: true, isDefault: false },
    ]);
    if (path === "/api/users") return respond(route, [
      { id: cashierId, nama: "Kasir QA", username: "kasir", role: "kasir", active: true },
    ]);
    if (path === `/api/users/${cashierId}/outlets`) {
      if (route.request().method() === "PUT") submitted = route.request().postDataJSON();
      return respond(route, route.request().method() === "PUT" ? [mainId, branchId] : [mainId]);
    }
    return respond(route, []);
  });
  await page.goto("/pengguna");
  await page.getByRole("button", { name: "Outlet", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Penugasan outlet" })).toBeVisible();
  await page.getByLabel("Cabang Dua").check();
  await page.getByRole("button", { name: "Simpan Penugasan" }).click();
  await expect.poll(() => submitted).toEqual({ outletIds: [mainId, branchId] });
  await expect(page.getByRole("dialog", { name: "Penugasan outlet" })).toHaveCount(0);
});

test("empty restaurant offers owner direct table creation", async ({ page }) => {
  await session(page, "owner", true);
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    return respond(route, []);
  });
  await page.goto("/meja");
  await expect(page.getByText("Belum ada meja", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Meja", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tambah Meja" })).toBeVisible();
});

test("cashier cannot open table creation from empty restaurant", async ({ page }) => {
  await session(page, "kasir", true);
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    return respond(route, []);
  });
  await page.goto("/meja");
  await expect(page.getByText("Belum ada meja", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah Meja", exact: true })).toHaveCount(0);
  await expect(page.getByText(/hubungi owner\/admin/i)).toBeVisible();
});


test("dedicated kitchen account only navigates to price-free operator ticket route", async ({ page }) => {
  await session(page, "dapur", true);
  let operatorRequests = 0;
  let legacyRequests = 0;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    if (path === "/api/restaurant/kitchen/operator") operatorRequests += 1;
    if (path === "/api/restaurant/kitchen") legacyRequests += 1;
    return respond(route, []);
  });
  await page.goto("/dapur");
  await expect(page.getByRole("heading", { name: "Dapur" })).toBeVisible();
  await expect.poll(() => operatorRequests).toBeGreaterThan(0);
  expect(legacyRequests).toBe(0);
  await expect(page.getByRole("link", { name: "Kasir", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Produk", exact: true })).toHaveCount(0);
  await page.goto("/kasir");
  await expect(page).toHaveURL(/\/dapur$/);
});

test("reports default to aggregate and explicitly filter all report requests by outlet", async ({ page }) => {
  await session(page, "owner");
  const selectedHeaders: Record<string, string | null> = {};
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    if (path === "/api/outlets") return respond(route, [
      { id: mainId, name: "Utama", active: true, isDefault: true },
      { id: branchId, name: "Cabang Dua", active: true, isDefault: false },
    ]);
    if (path.startsWith("/api/laporan/")) {
      selectedHeaders[path] = route.request().headers()["x-outlet-id"] ?? null;
      if (path.endsWith("/summary")) return respond(route, { omzet: 100, transaksi: 1, avg: 100, pelanggan: 1 });
      return respond(route, []);
    }
    return respond(route, []);
  });
  await page.goto("/laporan");
  await expect(page.getByLabel("Cakupan outlet laporan")).toBeVisible();
  await expect(page.getByLabel("Cakupan outlet laporan")).toHaveValue("");
  await expect.poll(() => selectedHeaders["/api/laporan/summary"]).toBeNull();
  await page.getByLabel("Cakupan outlet laporan").selectOption(branchId);
  await page.getByRole("button", { name: "Terapkan" }).click();
  await expect.poll(() => selectedHeaders["/api/laporan/summary"]).toBe(branchId);
  await expect.poll(() => selectedHeaders["/api/laporan/chart"]).toBe(branchId);
  await expect.poll(() => selectedHeaders["/api/laporan/top-products"]).toBe(branchId);
});
