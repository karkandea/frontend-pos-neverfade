import { expect, test, type Route } from "@playwright/test";

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.beforeEach(({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chromium", "Status matrix runs once.");
  return page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "tenant-owner-token");
  });
});

test("transaction history renders authoritative paid pending failed expired and cancelled states", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      return json(route, { id: "user", nama: "Owner", username: "owner", role: "owner" });
    }
    if (path === "/api/transactions") {
      const base = {
        tanggal: "2026-08-19T08:00:00Z",
        kasir: "Kasir",
        customerId: null,
        customerNama: "",
        items: [], subtotal: 10000, disc: 0, tax: 0, discAmt: 0, taxAmt: 0,
        total: 10000, metodePembayaran: "QRIS", dibayar: 0, kembalian: 0,
      };
      return json(route, [
        { ...base, id: "1", noTrx: "TRX-PAID", status: "paid", paymentStatus: "paid", paymentFailureCode: null },
        { ...base, id: "2", noTrx: "TRX-PENDING", status: "pending_payment", paymentStatus: "pending", paymentFailureCode: null },
        { ...base, id: "3", noTrx: "TRX-FAILED", status: "failed", paymentStatus: "failed", paymentFailureCode: "PAYMENT_FAILED" },
        { ...base, id: "4", noTrx: "TRX-EXPIRED", status: "failed", paymentStatus: "expired", paymentFailureCode: "PAYMENT_REQUEST_EXPIRED" },
        { ...base, id: "5", noTrx: "TRX-CANCEL", status: "failed", paymentStatus: "failed", paymentFailureCode: "PAYMENT_REQUEST_CANCELED" },
      ]);
    }
    return json(route, {});
  });

  await page.goto("/transaksi");
  for (const label of ["Selesai", "Pending pembayaran", "Gagal", "Kedaluwarsa", "Dibatalkan"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});
