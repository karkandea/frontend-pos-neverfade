import { expect, test, type Page, type Route } from "@playwright/test";

const product = {
  id: "44444444-4444-4444-4444-444444444444",
  kode: "XENDIT-001",
  barcode: "899000000004",
  nama: "Produk Xendit QA",
  kategori: "QA",
  hargaJual: 32000,
  stok: 10,
};

const hosted = {
  id: "55555555-5555-5555-5555-555555555555",
  transactionId: "66666666-6666-6666-6666-666666666666",
  providerSessionId: "ps-qa-hosted",
  providerReferenceId: "nf-qa-hosted",
  amount: 32000,
  currency: "IDR",
  status: "pending",
  checkoutUrl: "http://127.0.0.1:4173/xendit-hosted",
  expiresAt: "2099-09-13T20:00:00Z",
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function setup(page: Page, hostedEnabled = true) {
  const state = { createCount: 0, payload: null as Record<string, unknown> | null };

  await page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "tenant-owner-token");
  });

  await page.route("**/xendit-hosted", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Xendit Hosted QA</h1>" })
  );

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/auth/me") {
      return json(route, {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        nama: "Owner QA",
        username: "owner.qa",
        role: "owner",
      });
    }
    if (path === "/api/products") return json(route, [product]);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") {
      return json(route, {
        defaultTax: 0,
        headerStruk: "NeverFade QA",
        footerStruk: "Terima kasih",
      });
    }
    if (path === "/api/payments/capabilities") {
      return json(route, {
        qrisEnabled: true,
        hostedCheckoutEnabled: hostedEnabled,
        mode: "sandbox",
        isSandbox: true,
      });
    }
    if (path === "/api/payments/current") {
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/payments/hosted" && request.method() === "POST") {
      state.createCount += 1;
      state.payload = request.postDataJSON() as Record<string, unknown>;
      return json(route, hosted);
    }
    if (path === `/api/payments/${hosted.id}`) {
      return json(route, {
        ...hosted,
        status: "paid",
        method: "xendit_hosted",
        providerPaymentRequestId: "pr-qa-hosted",
        providerSessionId: hosted.providerSessionId,
        qrString: null,
        failureCode: null,
        updatedAt: "2026-09-13T11:00:00Z",
      });
    }
    if (path === `/api/transactions/${hosted.transactionId}`) {
      return json(route, {
        id: hosted.transactionId,
        customerId: null,
        customerNama: "",
        createdAt: "2026-09-13T10:59:00Z",
        noTrx: "TRX-20260913-0001",
        subtotal: 32000,
        disc: 0,
        tax: 0,
        discAmt: 0,
        taxAmt: 0,
        total: 32000,
        dibayar: 32000,
        kembalian: 0,
        metodePembayaran: "XENDIT",
        items: [{
          id: product.id,
          nama: product.nama,
          hargaJual: product.hargaJual,
          qty: 1,
          subtotal: product.hargaJual,
        }],
      });
    }
    return json(route, {});
  });

  await page.goto("/kasir");
  return state;
}

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(
    testInfo.project.name !== "Desktop Chromium",
    "Hosted checkout scenarios run once on desktop."
  );
});

test("creates hosted Xendit checkout and recovers paid status on return", async ({ page }) => {
  const state = await setup(page);

  await page.getByRole("button", { name: `Tambah ${product.nama} ke keranjang` }).click();
  await page.locator(".payment-options").getByRole("button", { name: "XENDIT" }).click();
  await page.getByRole("button", { name: "Proses Transaksi" }).click();

  await expect(page.getByRole("heading", { name: "Xendit Hosted QA" })).toBeVisible();
  expect(state.createCount).toBe(1);
  expect(state.payload).toMatchObject({
    metodePembayaran: "XENDIT",
    dibayar: 0,
    kembalian: 0,
    total: 32000,
  });

  await page.goto("/kasir");
  await expect(page.getByText("Pembayaran Xendit berhasil")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Xendit Checkout" })).toBeVisible();
});

test("hides hosted Xendit checkout when capability is disabled", async ({ page }) => {
  await setup(page, false);
  await expect(
    page.locator(".payment-options").getByRole("button", { name: "XENDIT" })
  ).toHaveCount(0);
});
