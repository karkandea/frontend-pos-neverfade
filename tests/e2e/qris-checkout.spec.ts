import {
  expect,
  test,
  type Page,
  type Route,
} from "@playwright/test";

const product = {
  id: "11111111-1111-1111-1111-111111111111",
  kode: "QRIS-001",
  barcode: "899000000001",
  nama: "Produk QRIS QA",
  kategori: "QA",
  hargaJual: 25000,
  stok: 10,
};

const payment = {
  id: "22222222-2222-2222-2222-222222222222",
  transactionId: "33333333-3333-3333-3333-333333333333",
  providerPaymentRequestId: "pr-qa-qris",
  amount: 25000,
  currency: "IDR",
  status: "pending",
  qrString: "00020101021226670016COM.NOBUBANK.WWW01189360050300000879140214123456789012340303UMI51440014ID.CO.QRIS.WWW0215ID10200211800100303UMI5204581253033605405250005802ID5915NEVERFADE QA6007JAKARTA6105123406304ABCD",
  expiresAt: "2026-08-11T18:00:00Z",
};

type SetupOptions = {
  statuses?: string[];
  createDelay?: number;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function setupCheckout(
  page: Page,
  options: SetupOptions = {}
) {
  const state = {
    createCount: 0,
    createPayload: null as Record<string, unknown> | null,
    statusCount: 0,
  };
  const statuses = options.statuses ?? ["pending"];

  await page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "tenant-owner-token");
  });

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

    if (path === "/api/products") {
      return json(route, [product]);
    }

    if (path === "/api/customers") {
      return json(route, []);
    }

    if (path === "/api/settings") {
      return json(route, {
        defaultTax: 0,
        headerStruk: "NeverFade QA",
        footerStruk: "Terima kasih",
      });
    }

    if (
      path === "/api/payments/qris" &&
      request.method() === "POST"
    ) {
      state.createCount += 1;
      state.createPayload = request.postDataJSON() as Record<
        string,
        unknown
      >;

      if (options.createDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.createDelay)
        );
      }

      return json(route, payment);
    }

    if (path === `/api/payments/${payment.id}`) {
      const index = Math.min(
        state.statusCount,
        statuses.length - 1
      );
      const status = statuses[index];
      state.statusCount += 1;

      return json(route, {
        id: payment.id,
        transactionId: payment.transactionId,
        status,
      });
    }

    if (path === `/api/transactions/${payment.transactionId}`) {
      return json(route, {
        id: payment.transactionId,
        noTrx: "TRX-20260811-0099",
        subtotal: 25000,
        discAmt: 0,
        taxAmt: 0,
        total: 25000,
        dibayar: 25000,
        kembalian: 0,
        metodePembayaran: "QRIS",
        items: [
          {
            id: product.id,
            nama: product.nama,
            hargaJual: product.hargaJual,
            qty: 1,
            subtotal: product.hargaJual,
          },
        ],
      });
    }

    return json(route, {});
  });

  await page.goto("/kasir");
  await expect(
    page.getByRole("heading", { name: "Kasir", exact: true })
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: `Tambah ${product.nama} ke keranjang`,
    })
    .click();
  await page
    .locator(".payment-options")
    .getByRole("button", { name: "QRIS" })
    .click();

  return state;
}

async function submitCheckout(page: Page) {
  await page
    .getByRole("button", { name: "Proses Transaksi" })
    .click();
}

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(
    testInfo.project.name !== "Desktop Chromium",
    "Payment state scenarios run once on desktop."
  );
});

test("creates QRIS payment through NeverFade backend", async ({ page }) => {
  const state = await setupCheckout(page);

  await submitCheckout(page);

  await expect
    .poll(() => state.createCount)
    .toBe(1);
  expect(state.createPayload).toMatchObject({
    metodePembayaran: "QRIS",
    dibayar: 0,
    kembalian: 0,
    total: 25000,
  });
  await expect(
    page.getByRole("dialog", { name: "Pembayaran QRIS" })
  ).toBeVisible();
  await expect(page.getByAltText("Kode QRIS pembayaran")).toHaveAttribute(
    "src",
    /^data:image\/png;base64,/
  );
});

test("shows pending payment instructions from backend response", async ({
  page,
}) => {
  const state = await setupCheckout(page, {
    statuses: ["pending"],
  });

  await submitCheckout(page);

  await expect(page.getByText("Menunggu pembayaran")).toBeVisible();
  await expect(
    page.getByText("Menunggu konfirmasi aman dari server")
  ).toBeVisible();
  await expect(
    page.getByText("Scan kode QR dan pastikan nominalnya sesuai.")
  ).toBeVisible();
  await expect.poll(() => state.statusCount).toBeGreaterThan(0);
  await expect(page.getByText("Keranjang kosong")).not.toBeVisible();
});

test("successful backend payment status completes checkout", async ({
  page,
}) => {
  await setupCheckout(page, {
    statuses: ["pending", "paid"],
  });

  await submitCheckout(page);

  await expect(
    page.getByRole("heading", { name: "Preview Struk" })
  ).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".struk-container")).toContainText(
    "TRX-20260811-0099"
  );
  await expect(page.locator(".struk-container")).toContainText("QRIS");

  await page.getByRole("button", { name: "Tutup" }).click();
  await expect(page.getByText("Keranjang kosong")).toBeVisible();
});

test("failed backend payment does not complete checkout", async ({ page }) => {
  await setupCheckout(page, {
    statuses: ["failed"],
  });

  await submitCheckout(page);

  await expect(page.getByText("Pembayaran gagal")).toBeVisible();
  await expect(
    page.getByText("Transaksi belum diselesaikan")
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Preview Struk" })
  ).not.toBeVisible();

  await page
    .getByRole("button", { name: "Kembali ke Keranjang" })
    .click();
  await expect(page.locator(".cart-item")).toContainText(product.nama);
});

test("duplicate QRIS submit is prevented while request is pending", async ({
  page,
}) => {
  const state = await setupCheckout(page, {
    createDelay: 400,
  });
  const checkout = page.getByRole("button", {
    name: "Proses Transaksi",
  });

  await checkout.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect
    .poll(() => state.createCount)
    .toBe(1);
  await expect(checkout).toBeDisabled();
  await expect(page.getByText("Menunggu pembayaran")).toBeVisible();
});
