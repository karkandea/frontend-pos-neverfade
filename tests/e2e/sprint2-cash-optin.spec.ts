import { expect, test, type Page, type Route } from "@playwright/test";

// Run only against a deliberately flagged local Vite build; never target production.
test.skip(process.env.NF_S2_CASH_OPTIN_SMOKE !== "1", "Requires VITE_S2_CASH_CHECKOUT=enabled isolated frontend");

const tenantId = "99999999-9999-9999-9999-999999999999";
const outletId = "11111111-1111-1111-1111-111111111111";
const productId = "22222222-2222-2222-2222-222222222222";
const quoteId = "33333333-3333-3333-3333-333333333333";
const quoteVersion = "44444444-4444-4444-4444-444444444444";
const transactionId = "55555555-5555-5555-5555-555555555555";

function respond(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

type Options = {
  uncertainFirst?: boolean; quoteTotal?: number; terminalRetry?: boolean;
  committedAfterUnknown?: boolean; lookupUnavailable?: boolean;
};
async function setup(page: Page, options: Options = {}) {
  const state = {
    quotes: 0,
    lookups: [] as string[],
    commits: [] as { key: string; body: unknown }[],
    legacySales: 0,
  };
  await page.addInitScript(({ outlet }) => {
    localStorage.setItem("nfpos_token", "qa-owner-s2-token");
    localStorage.setItem("nfpos_active_outlet", outlet);
  }, { outlet: outletId });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const request = route.request();
    if (path === "/api/auth/me") return respond(route, {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", nama: "Owner QA", username: "qa.owner", role: "owner",
    });
    if (path === "/api/tenant/context") return respond(route, {
      tenantId, namaToko: "NeverFade QA", businessType: "general_retail", mode: "demo",
      capabilities: ["core_pos", "inventory", "customers", "reports"], role: "owner",
    });
    if (path === "/api/outlets") return respond(route, [{
      id: outletId, code: "QA", name: "QA Outlet", address: "QA", phone: "000",
      isDefault: true, active: true,
    }]);
    if (path === "/api/products") return respond(route, [{
      id: productId, kode: "S2-CASH", barcode: "", nama: "Barang Kasir S2",
      kategori: "QA", hargaJual: 25000, stok: 9, satuan: "pcs",
      type: "goods", tracksStock: true, quantityPrecision: 0,
    }]);
    if (path === "/api/customers") return respond(route, []);
    if (path === "/api/settings") return respond(route, {
      defaultTax: 10, showTax: false, headerStruk: "NeverFade QA", footerStruk: "Terima kasih",
    });
    if (path === "/api/payments/capabilities") return respond(route, {
      qrisEnabled: false, mode: "disabled", isSandbox: false,
    });
    if (path === "/api/payments/current") return route.fulfill({ status: 204, body: "" });
    if (path === "/api/v2/sales/quotes" && request.method() === "POST") {
      state.quotes++;
      return respond(route, { data: {
        quoteId, quoteVersion, outletId, customerId: null, status: "quoted",
        expiresAt: "2099-01-01T00:00:00Z", stockReserved: false,
        lines: [{ productId, variantId: null, priceLevelId: null, requestedPriceLevelId: null,
          productName: "Barang Kasir S2", unit: "pcs", priceLevelName: "Satuan",
          quantity: 1, unitPrice: 25000, subtotal: 25000, note: "" }],
        subtotal: 25000, discount: 0, discountPercent: 0, taxRatePercent: 0,
        tax: 0, serviceCharge: 0, total: options.quoteTotal ?? 25000,
        currency: "IDR", warnings: [],
      }, meta: { correlationId: "qa-s2" } });
    }
    if (path.startsWith("/api/v2/sales/cash/idempotency/") && request.method() === "GET") {
      const key = decodeURIComponent(path.split("/").at(-1) ?? "");
      state.lookups.push(key);
      if (options.lookupUnavailable)
        return respond(route, { code: "TEMPORARY_UNAVAILABLE", message: "Status belum tersedia" }, 503);
      if (options.committedAfterUnknown && state.commits.length > 0) return respond(route, {
        data: {
          id: transactionId, noTrx: "TRX-20260926-0099", status: "paid",
          metodePembayaran: "tunai", total: 25000, dibayar: 25000, kembalian: 0,
        },
        meta: { correlationId: "qa-s2", replayed: true },
      });
      return respond(route, { code: "CASH_COMMIT_NOT_CONFIRMED", message: "Belum terkonfirmasi" }, 404);
    }
    if (path === "/api/v2/sales/cash" && request.method() === "POST") {
      state.commits.push({ key: request.headers()["idempotency-key"] ?? "", body: request.postDataJSON() });
      if (options.uncertainFirst && state.commits.length === 1)
        return respond(route, { code: "PAYMENT_STATUS_UNKNOWN", message: "Respons transaksi belum diterima" }, 503);
      if (options.terminalRetry && state.commits.length === 2)
        return respond(route, { code: "QUOTE_EXPIRED", message: "Quote sudah kedaluwarsa" }, 409);
      return respond(route, { data: {
        id: transactionId, noTrx: "TRX-20260926-0099", status: "paid",
        metodePembayaran: "tunai", total: 25000, dibayar: 25000, kembalian: 0,
      }, meta: { correlationId: "qa-s2", replayed: state.commits.length > 1,
        quoteId, quoteVersion } });
    }
    if (path === `/api/transactions/${transactionId}` && request.method() === "GET")
      return respond(route, {
        id: transactionId, transactionId, noTrx: "TRX-20260926-0099",
        createdAt: "2026-09-26T12:00:00Z", kasir: "Owner QA", customerId: null,
        subtotal: 25000, discAmt: 0, taxAmt: 0, total: 25000,
        dibayar: 25000, kembalian: 0, metodePembayaran: "tunai",
        items: [{ id: productId, nama: "Barang Kasir S2", hargaJual: 25000,
          qty: 1, quantity: 1, subtotal: 25000 }],
      });
    if (path === "/api/transactions" && request.method() === "POST") {
      state.legacySales++;
      return respond(route, { message: "Legacy sale must never be called by S2 opt-in" }, 500);
    }
    return respond(route, []);
  });
  await page.goto("/kasir");
  await expect(page.getByRole("heading", { name: "Kasir", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("nfpos_active_outlet"))).toBe(outletId);
  return state;
}

async function beginSale(page: Page) {
  await page.getByRole("button", { name: "Tambah Barang Kasir S2 ke keranjang" }).click();
  const mobileDock = page.getByRole("button", { name: /Buka keranjang/ });
  if (await mobileDock.isVisible().catch(() => false)) await mobileDock.click();
  await page.locator("#cash-received").fill("25000");
  await page.getByRole("button", { name: "Proses Transaksi" }).click();
}

test("opt-in cash uses server quote and one idempotent v2 commit, not legacy endpoint", async ({ page }) => {
  const state = await setup(page);
  await expect(page.locator('input[aria-label="Pajak persen"]')).toBeDisabled();
  await expect(page.locator('input[aria-label="Pajak persen"]')).toHaveValue("0");
  await beginSale(page);
  await expect(page.getByRole("heading", { name: "Transaksi Berhasil" })).toBeVisible();
  expect(state.quotes).toBe(1);
  expect(state.commits).toHaveLength(1);
  expect(state.commits[0].key).toMatch(/^[a-zA-Z0-9_-]{16,128}$/);
  expect(state.commits[0].body).toMatchObject({ quoteId, quoteVersion, amountReceived: 25000 });
  expect(state.legacySales).toBe(0);
});

test("unconfirmed cash reply persists quote/key across reload and retries exactly same commit", async ({ page }) => {
  const state = await setup(page, { uncertainFirst: true });
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
  await beginSale(page);
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  expect(state.quotes).toBe(1);
  expect(state.commits).toHaveLength(1);
  const retryButton = page.getByRole("button", { name: "Proses Transaksi" });
  // The mobile cart may have closed automatically; no second submit is possible
  // without reopening it. Desktop's visible retry must not mint a new sale.
  if (await retryButton.isVisible().catch(() => false)) await retryButton.click();
  expect(state.commits).toHaveLength(1);
  await page.reload();
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  const mobileClose = page.getByRole("button", { name: "Tutup keranjang" });
  if (await mobileClose.isVisible().catch(() => false)) await mobileClose.click();
  await page.getByRole("button", { name: "Pulihkan Transaksi Tunai" }).click();
  await expect(page.getByRole("heading", { name: "Transaksi Berhasil" })).toBeVisible();
  expect(state.quotes).toBe(1);
  expect(state.lookups).toEqual([state.commits[0].key]);
  expect(state.commits).toHaveLength(2);
  expect(state.commits[1]).toEqual(state.commits[0]);
  expect(state.legacySales).toBe(0);
  expect(dialogs).toHaveLength(1);
});

test("server money mismatch stops before payment commit", async ({ page }) => {
  const state = await setup(page, { quoteTotal: 25001 });
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
  await beginSale(page);
  await expect.poll(() => dialogs.length).toBe(1);
  expect(dialogs[0]).toContain("Total atau pajak dari server berbeda");
  expect(state.quotes).toBe(1);
  expect(state.commits).toHaveLength(0);
  expect(state.legacySales).toBe(0);
});


test("only authoritative no-sale rejection releases a pending quote", async ({ page }) => {
  const state = await setup(page, { uncertainFirst: true, terminalRetry: true });
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await beginSale(page);
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  await page.getByRole("button", { name: "Pulihkan Transaksi Tunai" }).click();
  await expect(page.getByText("Status transaksi tunai perlu perhatian.")).toBeVisible();
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toHaveCount(0);
  expect(state.commits).toHaveLength(2);
  expect(state.commits[1]).toEqual(state.commits[0]);
  expect(state.legacySales).toBe(0);
});


test("read-only key lookup recovers completed sale without second write", async ({ page }) => {
  const state = await setup(page, { uncertainFirst: true, committedAfterUnknown: true });
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await beginSale(page);
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  const mobileClose = page.getByRole("button", { name: "Tutup keranjang" });
  if (await mobileClose.isVisible().catch(() => false)) await mobileClose.click();
  await page.getByRole("button", { name: "Pulihkan Transaksi Tunai" }).click();
  await expect(page.getByRole("heading", { name: "Transaksi Berhasil" })).toBeVisible();
  expect(state.quotes).toBe(1);
  expect(state.lookups).toEqual([state.commits[0].key]);
  expect(state.commits).toHaveLength(1);
  expect(state.legacySales).toBe(0);
});

test("lookup 503 preserves original cash key without speculative replay", async ({ page }) => {
  const state = await setup(page, { uncertainFirst: true, lookupUnavailable: true });
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await beginSale(page);
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  const mobileClose = page.getByRole("button", { name: "Tutup keranjang" });
  if (await mobileClose.isVisible().catch(() => false)) await mobileClose.click();
  await page.getByRole("button", { name: "Pulihkan Transaksi Tunai" }).click();
  await expect(page.getByText("Status transaksi tunai perlu perhatian.")).toBeVisible();
  await expect(page.getByText("Transaksi tunai belum terkonfirmasi.")).toBeVisible();
  expect(state.lookups).toEqual([state.commits[0].key]);
  expect(state.commits).toHaveLength(1);
  expect(state.legacySales).toBe(0);
});
