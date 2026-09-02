import { mkdir } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

const product = {
  id: "visual-product",
  kode: "VISUAL-001",
  barcode: "899000000077",
  nama: "Burger Mobile QA",
  kategori: "Makanan",
  hargaJual: 42000,
  stok: 20,
};

const qrString = "00020101021226670016COM.NOBUBANK.WWW01189360050300000879140214123456789012340303UMI51440014ID.CO.QRIS.WWW0215ID10200211800100303UMI5204581253033605405250005802ID5915NEVERFADE QA6007JAKARTA6105123406304ABCD";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function setup(page: Page, qrisEnabled: boolean) {
  await page.addInitScript(() => {
    sessionStorage.setItem("nfpos_token", "visual-owner-token");
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/auth/me") {
      return json(route, {
        id: "visual-owner",
        nama: "Owner Visual QA",
        username: "owner.visual",
        role: "owner",
      });
    }
    if (path === "/api/products") return json(route, [product]);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") {
      return json(route, {
        defaultTax: 0,
        headerStruk: "NeverFade Mobile QA",
        footerStruk: "Terima kasih",
      });
    }
    if (path === "/api/payments/capabilities") {
      return json(route, {
        qrisEnabled,
        mode: qrisEnabled ? "sandbox" : "disabled",
        isSandbox: qrisEnabled,
      });
    }
    if (path === "/api/payments/current") {
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/transactions" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      return json(route, {
        id: "visual-cash-transaction",
        createdAt: "2026-08-23T10:00:00Z",
        noTrx: "TRX-VISUAL-001",
        subtotal: payload.subtotal,
        discAmt: payload.discAmt,
        taxAmt: payload.taxAmt,
        total: payload.total,
        dibayar: payload.dibayar,
        kembalian: payload.kembalian,
        metodePembayaran: payload.metodePembayaran,
        items: payload.items,
      });
    }
    if (path === "/api/payments/qris" && request.method() === "POST") {
      return json(route, {
        id: "visual-payment",
        transactionId: "visual-qris-transaction",
        providerPaymentRequestId: "pr-mobile-visual",
        providerReferenceId: "nf-mobile-visual",
        amount: 42000,
        currency: "IDR",
        status: "pending",
        qrString,
        expiresAt: "2099-08-23T18:00:00Z",
      });
    }
    if (path === "/api/payments/visual-payment") {
      return json(route, {
        id: "visual-payment",
        transactionId: "visual-qris-transaction",
        providerPaymentRequestId: "pr-mobile-visual",
        providerReferenceId: "nf-mobile-visual",
        amount: 42000,
        currency: "IDR",
        status: "pending",
        qrString,
        expiresAt: "2099-08-23T18:00:00Z",
      });
    }

    return json(route, []);
  });
  await mockTenantContext(page);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir("test-results/mobile-evidence", { recursive: true });
});

test("candidate cash workflow visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile Chromium", "Visual evidence runs once on touch mobile.");
  await setup(page, false);
  await page.goto("/kasir");

  await page.getByRole("button", { name: `Tambah ${product.nama} ke keranjang` }).click();
  await expect(page.getByRole("button", { name: /Buka keranjang/ })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-evidence/after-candidate-390x844-browse-cart-dock.png" });

  await page.getByRole("button", { name: /Buka keranjang/ }).click();
  const cart = page.getByRole("dialog", { name: "Keranjang transaksi" });
  await expect(cart).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-evidence/after-candidate-390x844-cart-sheet.png" });

  await cart.getByRole("button", { name: "Uang Pas" }).click();
  await cart.getByRole("button", { name: /Proses Transaksi/ }).click();
  const success = page.getByRole("dialog", { name: "Transaksi Berhasil" });
  await expect(success).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-evidence/after-candidate-390x844-cash-success.png" });
});

test("candidate QRIS pending visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile Chromium", "Visual evidence runs once on touch mobile.");
  await setup(page, true);
  await page.goto("/kasir");

  await page.getByRole("button", { name: `Tambah ${product.nama} ke keranjang` }).click();
  await page.getByRole("button", { name: /Buka keranjang/ }).click();
  const cart = page.getByRole("dialog", { name: "Keranjang transaksi" });
  await cart.getByRole("button", { name: "QRIS" }).click();
  await cart.getByRole("button", { name: /Proses Transaksi/ }).click();

  const qris = page.getByRole("dialog", { name: "Pembayaran QRIS" });
  await expect(qris).toBeVisible();
  await expect(qris.getByAltText("Kode QRIS pembayaran")).toBeVisible();
  await expect(qris.getByText("SANDBOX — TIDAK ADA DANA NYATA")).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-evidence/after-candidate-390x844-qris-pending.png" });
});
