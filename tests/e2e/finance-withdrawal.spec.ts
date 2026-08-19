import { expect, test, type Page, type Route } from "@playwright/test";

const owner = {
  id: "11111111-1111-1111-1111-111111111111",
  nama: "Owner Finance",
  username: "owner.finance",
  role: "owner",
};

const platformUser = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  nama: "Platform Admin",
  username: "platform.admin",
  role: "superadmin",
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function tenantSession(page: Page) {
  await page.addInitScript(() => localStorage.setItem("nfpos_token", "tenant-owner-token"));
}

test("owner sees authoritative finance summary, requests withdrawal, and sees history", async ({ page }) => {
  await tenantSession(page);
  let summary = {
    availableBalance: 750000,
    totalSuccessfulNonCashIncome: 1000000,
    totalWithdrawn: 150000,
    pendingWithdrawalAmount: 100000,
  };
  const withdrawals = [{
    id: "22222222-2222-2222-2222-222222222222",
    amount: 100000,
    status: "requested",
    requestedAt: "2026-08-14T04:00:00Z",
    processedAt: null,
  }];
  const movements = [{
    id: "movement-credit",
    type: "qris_credit",
    status: "paid",
    amount: 1000000,
    timestamp: "2026-08-14T03:00:00Z",
    reference: "py-xendit-qa",
    paymentId: "payment-qa",
    transactionId: "transaction-qa",
    withdrawalId: null,
  }];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return json(route, owner);
    if (path === "/api/finance/summary") return json(route, summary);
    if (path === "/api/finance/withdrawals" && request.method() === "GET") return json(route, withdrawals);
    if (path === "/api/finance/movements") return json(route, movements);
    if (path === "/api/finance/withdrawals" && request.method() === "POST") {
      const payload = request.postDataJSON() as { amount: number };
      const created = { id: "33333333-3333-3333-3333-333333333333", amount: payload.amount, status: "requested", requestedAt: "2026-08-14T05:00:00Z", processedAt: null };
      withdrawals.unshift(created);
      summary = { ...summary, availableBalance: summary.availableBalance - payload.amount, pendingWithdrawalAmount: summary.pendingWithdrawalAmount + payload.amount };
      return json(route, created);
    }
    return json(route, {});
  });

  await page.goto("/keuangan");
  await expect(page.getByRole("heading", { name: "Keuangan" })).toBeVisible();
  await expect(page.getByText(/Rp\s*750\.000/).first()).toBeVisible();
  await expect(page.getByText(/Rp\s*1\.000\.000/).first()).toBeVisible();
  await expect(page.getByText(/Rp\s*150\.000/)).toBeVisible();
  await expect(page.getByText(/Rp\s*100\.000/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Riwayat Pencairan" })).toBeVisible();

  await page.getByLabel("Jumlah pencairan").fill("250000");
  page.once("dialog", async (dialog) => {
    expect(dialog.message().replace(/\s/g, "")).toContain("Rp250.000");
    expect(dialog.message().replace(/\s/g, "")).toContain("Rp500.000");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Ajukan Pencairan" }).click();
  await expect(page.getByText("Permintaan pencairan berhasil dikirim.")).toBeVisible();
  await expect(page.getByText(/Rp\s*250\.000/)).toBeVisible();
  await expect(page.getByText(/Rp\s*500\.000/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mutasi Saldo" })).toBeVisible();
  await expect(page.getByText("py-xendit-qa")).toBeVisible();
});

test("owner sees insufficient balance error returned by backend", async ({ page }) => {
  await tenantSession(page);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return json(route, owner);
    if (path === "/api/finance/summary") return json(route, { availableBalance: 50000, totalSuccessfulNonCashIncome: 50000, totalWithdrawn: 0, pendingWithdrawalAmount: 0 });
    if (path === "/api/finance/withdrawals" && request.method() === "GET") return json(route, []);
    if (path === "/api/finance/movements") return json(route, []);
    if (path === "/api/finance/withdrawals" && request.method() === "POST") return json(route, { code: "WITHDRAWAL_INSUFFICIENT_BALANCE", message: "Saldo tersedia tidak mencukupi untuk pencairan ini." }, 409);
    return json(route, {});
  });

  await page.goto("/keuangan");
  await page.getByLabel("Jumlah pencairan").fill("100000");
  await page.getByRole("button", { name: "Ajukan Pencairan" }).click();
  await expect(page.getByRole("alert")).toContainText("Saldo tersedia tidak mencukupi");
  await expect(page.getByText("Belum ada pencairan")).toBeVisible();
});

test("super admin marks one withdrawal paid and rejects another", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nfpos_platform_token", "platform-token"));
  const withdrawals = [
    { id: "44444444-4444-4444-4444-444444444444", tenantId: "tenant-a", tenantName: "Kopi Tenant", requestedByUserId: "owner-a", requestedByName: "Owner Kopi", requestedByUsername: "owner.kopi", amount: 300000, status: "requested", requestedAt: "2026-08-14T06:00:00Z", processedAt: null },
    { id: "55555555-5555-5555-5555-555555555555", tenantId: "tenant-b", tenantName: "Bakso Tenant", requestedByUserId: "owner-b", requestedByName: "Owner Bakso", requestedByUsername: "owner.bakso", amount: 200000, status: "requested", requestedAt: "2026-08-14T05:00:00Z", processedAt: null },
  ];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/platform/auth/me") return json(route, platformUser);
    if (path === "/api/platform/withdrawals" && request.method() === "GET") return json(route, withdrawals);
    const match = path.match(/^\/api\/platform\/withdrawals\/([^/]+)\/(mark-paid|reject)$/);
    if (match) {
      const item = withdrawals.find((entry) => entry.id === match[1])!;
      Object.assign(item, { status: match[2] === "mark-paid" ? "paid" : "rejected", processedAt: "2026-08-14T07:00:00Z" });
      return json(route, item);
    }
    return json(route, {});
  });

  await page.goto("/platform/withdrawals");
  await expect(page.getByRole("heading", { name: "Pencairan" })).toBeVisible();
  const kopiRow = page.getByRole("row").filter({ hasText: "Kopi Tenant" });
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Kopi Tenant");
    expect(dialog.message().replace(/\s/g, "")).toContain("Rp300.000");
    expect(dialog.message()).toContain("44444444-4444-4444-4444-444444444444");
    await dialog.accept();
  });
  await kopiRow.getByRole("button", { name: "Tandai Dibayar" }).click();
  await expect(page.getByText("Pencairan ditandai sudah dibayar.")).toBeVisible();
  await expect(kopiRow.getByText("Dibayar")).toBeVisible();

  const baksoRow = page.getByRole("row").filter({ hasText: "Bakso Tenant" });
  page.once("dialog", (dialog) => dialog.accept());
  await baksoRow.getByRole("button", { name: "Tolak" }).click();
  await expect(page.getByText("Permintaan pencairan ditolak.")).toBeVisible();
  await expect(baksoRow.getByText("Ditolak")).toBeVisible();
});
