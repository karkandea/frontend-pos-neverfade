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
  providerReferenceId: "nf-qa-qris",
  amount: 25000,
  currency: "IDR",
  status: "pending",
  qrString: "00020101021226670016COM.NOBUBANK.WWW01189360050300000879140214123456789012340303UMI51440014ID.CO.QRIS.WWW0215ID10200211800100303UMI5204581253033605405250005802ID5915NEVERFADE QA6007JAKARTA6105123406304ABCD",
  expiresAt: "2026-08-11T18:00:00Z",
};

type SetupOptions = {
  statuses?: string[];
  createDelay?: number;
  qrisEnabled?: boolean;
  paymentMode?: "disabled" | "sandbox" | "live";
  receiptFailures?: number;
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
    receiptCount: 0,
  };
  const statuses = options.statuses ?? ["pending"];
  const qrisEnabled = options.qrisEnabled ?? true;
  const paymentMode = options.paymentMode ?? "sandbox";

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

    if (path === "/api/payments/capabilities") {
      return json(route, {
        qrisEnabled,
        mode: paymentMode,
        isSandbox: paymentMode === "sandbox",
      });
    }

    if (path === "/api/payments/current") {
      return route.fulfill({ status: 204, body: "" });
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
        ...payment,
        status,
        failureCode: status === "expired" ? "PAYMENT_REQUEST_EXPIRED" : null,
        updatedAt: "2026-08-11T17:45:00Z",
      });
    }

    if (path === `/api/transactions/${payment.transactionId}`) {
      state.receiptCount += 1;
      if (state.receiptCount <= (options.receiptFailures ?? 0)) {
        return json(route, { message: "Detail transaksi belum tersedia." }, 503);
      }
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
  if (qrisEnabled) {
    await page
      .locator(".payment-options")
      .getByRole("button", { name: "QRIS" })
      .click();
  }

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

test("hides QRIS when backend capabilities disable it", async ({ page }) => {
  const state = await setupCheckout(page, {
    qrisEnabled: false,
    paymentMode: "disabled",
  });

  await expect(
    page
      .locator(".payment-options")
      .getByRole("button", { name: "QRIS", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByText("SANDBOX — TIDAK ADA DANA NYATA")
  ).toHaveCount(0);
  expect(state.createCount).toBe(0);
});

test("shows an unmistakable warning in Sandbox mode", async ({ page }) => {
  await setupCheckout(page);

  await expect(
    page.getByText("SANDBOX — TIDAK ADA DANA NYATA")
  ).toBeVisible();

  await submitCheckout(page);

  await expect(
    page
      .getByRole("dialog", { name: "Pembayaran QRIS" })
      .getByText("SANDBOX — TIDAK ADA DANA NYATA")
  ).toBeVisible();
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

  await expect(page.getByText("QRIS berhasil dibayar")).toBeVisible({
    timeout: 8000,
  });
  await expect(
    page.getByRole("dialog", { name: "Pembayaran QRIS" })
      .getByText(/Rp\s*25\.000/)
  ).toBeVisible();
  await page.getByRole("button", { name: "Lihat Struk" }).click();
  await expect(page.getByRole("heading", { name: "Preview Struk" })).toBeVisible();
  await expect(page.locator(".struk-container")).toContainText(
    "TRX-20260811-0099"
  );
  await expect(page.locator(".struk-container")).toContainText("QRIS");

  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await expect(page.getByText("Keranjang kosong")).toBeVisible();
});

test("paid state remains successful when receipt needs retry", async ({ page }) => {
  const state = await setupCheckout(page, {
    statuses: ["paid"],
    receiptFailures: 1,
  });

  await submitCheckout(page);

  await expect(page.getByText("QRIS berhasil dibayar")).toBeVisible();
  await expect(page.getByText(/detail struk belum dapat dimuat/i)).toBeVisible();
  await expect(page.getByText("Menunggu pembayaran")).toHaveCount(0);
  await page.getByRole("button", { name: "Coba Muat Struk Lagi" }).click();
  await expect.poll(() => state.receiptCount).toBe(2);
  await expect(page.getByRole("button", { name: "Lihat Struk" })).toBeEnabled();
});

test("expired payment is explicit and never completes checkout", async ({ page }) => {
  await setupCheckout(page, { statuses: ["expired"] });
  await submitCheckout(page);
  await expect(page.getByText("Pembayaran kedaluwarsa")).toBeVisible();
  await expect(page.getByText(/Waktu pembayaran telah habis/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview Struk" })).toHaveCount(0);
});

test("pending QRIS survives refresh without creating another payment", async ({ page }) => {
  const state = await setupCheckout(page, { statuses: ["pending"] });
  await submitCheckout(page);
  await expect(page.getByText("Menunggu pembayaran")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Menunggu pembayaran")).toBeVisible();
  await expect(page.getByText("pr-qa-qris")).toBeVisible();
  expect(state.createCount).toBe(1);
});

test("TRANSFER is not offered without an approved verification flow", async ({ page }) => {
  await setupCheckout(page);
  await expect(page.getByRole("button", { name: "TRANSFER" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "TUNAI" })).toBeVisible();
});

test("discount and tax inputs stay inside safe ranges", async ({ page }) => {
  await setupCheckout(page);
  await page.getByLabel("Diskon persen").fill("150");
  await page.getByLabel("Pajak persen").fill("-5");
  await expect(page.getByLabel("Diskon persen")).toHaveValue("100");
  await expect(page.getByLabel("Pajak persen")).toHaveValue("0");
});

test("QRIS dialog fits a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setupCheckout(page);
  await submitCheckout(page);
  const dialog = page.getByRole("dialog", { name: "Pembayaran QRIS" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(360);
  expect(box!.height).toBeLessThanOrEqual(640);
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
