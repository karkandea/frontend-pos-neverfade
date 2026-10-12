import { expect, test, type Page, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

const health = {
  stalledPayments: 2,
  unprocessedWebhooks: 1,
  stalledJobs: 0,
  needsAttention: true,
  outboxMetricsAvailable: false,
  workerDispatchAvailable: false,
};

const alerts = [{
  id: "alert-a",
  sourceKind: "payment_stalled",
  sourceId: "00000000-0000-4000-8000-000000000001",
  correlationId: "ops:payment_stalled:00000000000040008000000000000001",
  state: "open",
  createdAt: "2026-10-12T04:00:00Z",
}];

function respond(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function openDashboard(
  page: Page,
  role: "owner" | "admin",
  isUnavailable: () => boolean = () => false,
) {
  let opsCalls = 0;
  const user = {
    id: "qa-ops-user",
    nama: "QA Ops",
    username: role,
    role,
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login")
      return respond(route, { token: "qa-ops-token", user });
    if (path === "/api/auth/me") return respond(route, user);
    if (path === "/api/outlets") return respond(route, []);
    if (path === "/api/laporan/summary")
      return respond(route, { omzet: 250000, transaksi: 2, avg: 125000, pelanggan: 1 });
    if (path === "/api/laporan/chart") return respond(route, []);
    if (path === "/api/laporan/top-products") return respond(route, []);
    if (path.startsWith("/api/v2/ops/")) {
      opsCalls++;
      if (isUnavailable()) return respond(route, { code: "SERVICE_UNAVAILABLE" }, 503);
      return respond(route, { data: path.endsWith("/health") ? health : alerts,
        meta: { correlationId: "qa-ops", asOf: "2026-10-12T04:00:00Z" } });
    }
    return respond(route, []);
  });

  await mockTenantContext(page, role);
  await page.goto("/login");
  await page.getByLabel("Username").fill(role);
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  return () => opsCalls;
}

test("CORE15 owner sees real scoped signals, alert correlation and dispatch limitation", async ({ page }) => {
  const calls = await openDashboard(page, "owner");
  const region = page.getByRole("region", { name: "Pemantauan operasional owner" });
  await expect(region).toBeVisible();
  await expect(region.getByText("Ada anomali yang perlu diperiksa.")).toBeVisible();
  await expect(region.locator(".stats-grid").getByText("Pembayaran tertahan", { exact: true })).toBeVisible();
  await expect(region.getByText("2", { exact: true })).toBeVisible();
  await expect(region.getByText("Webhook belum diproses", { exact: true })).toBeVisible();
  await expect(region.getByText(/ops:payment_stalled:/)).toBeVisible();
  await expect(region.getByText(/Metrik outbox dan pengiriman worker belum tersedia/)).toBeVisible();
  expect(calls()).toBe(2);
});

test("CORE15 admin never requests owner-only ops endpoint", async ({ page }) => {
  const calls = await openDashboard(page, "admin");
  await expect(page.getByRole("region", { name: "Pemantauan operasional owner" }))
    .toHaveCount(0);
  expect(calls()).toBe(0);
});

test("CORE15 failed signal retrieval does not falsely show healthy and can retry", async ({ page }) => {
  let unavailable = true;
  await openDashboard(page, "owner", () => unavailable);
  const region = page.getByRole("region", { name: "Pemantauan operasional owner" });
  await expect(region.getByRole("alert"))
    .toContainText("Ini bukan berarti sistem aman");
  unavailable = false;
  await region.getByRole("button", { name: "Perbarui" }).click();
  await expect(region.getByText("Ada anomali yang perlu diperiksa.")).toBeVisible();
  await expect(region.getByRole("alert")).toHaveCount(0);
});

test("CORE15 skips hidden-tab polling and immediately rechecks on return", async ({ page }) => {
  await page.clock.install();
  const calls = await openDashboard(page, "owner");
  const region = page.getByRole("region", { name: "Pemantauan operasional owner" });
  await expect(region.getByText("Ada anomali yang perlu diperiksa.")).toBeVisible();
  await expect.poll(calls).toBe(2);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
  });
  await page.clock.fastForward(60_000);
  expect(calls()).toBe(2);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(calls).toBe(4);
  await expect(region.getByRole("alert")).toHaveCount(0);
});

test("CORE15 refreshes owner signals after one minute while dashboard is visible", async ({ page }) => {
  await page.clock.install();
  const calls = await openDashboard(page, "owner");
  await expect.poll(calls).toBe(2);
  await page.clock.fastForward(60_000);
  await expect.poll(calls).toBe(4);
  await expect(page.getByText("Terakhir diperiksa:")).toBeVisible();
});
