import { expect, test, type Page, type Route } from "@playwright/test";

const owner = {
  id: "11111111-1111-1111-1111-111111111111",
  nama: "Owner Fashion",
  username: "owner",
  role: "owner",
};

const productId = "22222222-2222-2222-2222-222222222222";
const transactionId = "33333333-3333-3333-3333-333333333333";
const transactionItemId = "44444444-4444-4444-4444-444444444444";
const originalVariantId = "55555555-5555-5555-5555-555555555555";
const replacementVariantId = "66666666-6666-6666-6666-666666666666";

const transaction = {
  id: transactionId,
  noTrx: "TRX-RETURN-001",
  tanggal: "2026-09-14T09:00:00Z",
  kasir: "Owner Fashion",
  customerId: null,
  customerNama: "Budi Fashion",
  items: [
    {
      id: productId,
      transactionItemId,
      nama: "Kaos Oversize",
      hargaJual: 100000,
      productVariantId: originalVariantId,
      variantSku: "TSHIRT-BLK-M",
      variantLabel: "Black / M",
      qty: 3,
      quantity: 3,
      productType: "goods",
      tracksStock: true,
      subtotal: 300000,
    },
  ],
  subtotal: 300000,
  disc: 0,
  tax: 0,
  discAmt: 0,
  taxAmt: 0,
  total: 300000,
  metodePembayaran: "tunai",
  dibayar: 300000,
  kembalian: 0,
  status: "paid",
  paymentStatus: null,
  paymentFailureCode: null,
};

const catalog = {
  priceLevels: [],
  products: [
    {
      id: productId,
      kode: "TSHIRT",
      barcode: "",
      nama: "Kaos Oversize",
      kategori: "Fashion",
      hargaModal: 50000,
      hargaJual: 100000,
      stok: 8,
      supplier: "QA",
      satuan: "pcs",
      deskripsi: "",
      type: "goods",
      tracksStock: true,
      quantityPrecision: 0,
      variants: [
        {
          id: originalVariantId,
          productId,
          sku: "TSHIRT-BLK-M",
          barcode: "8991111111111",
          label: "Black / M",
          option1Name: "Size",
          option1Value: "M",
          option2Name: "Color",
          option2Value: "Black",
          option3Name: "",
          option3Value: "",
          hargaModal: null,
          hargaJual: null,
          stok: 5,
          active: true,
        },
        {
          id: replacementVariantId,
          productId,
          sku: "TSHIRT-BLK-L",
          barcode: "8991111111112",
          label: "Black / L",
          option1Name: "Size",
          option1Value: "L",
          option2Name: "Color",
          option2Value: "Black",
          option3Name: "",
          option3Value: "",
          hargaModal: null,
          hargaJual: null,
          stok: 3,
          active: true,
        },
      ],
      prices: [],
    },
  ],
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function returnsSession(page: Page) {
  await page.addInitScript(() => localStorage.setItem("nfpos_token", "returns-token"));
  await page.route("**/api/auth/me", (route) => json(route, owner));
  await page.route("**/api/tenant/context", (route) =>
    json(route, {
      tenantId: "99999999-9999-9999-9999-999999999999",
      namaToko: "NeverFade Fashion QA",
      businessType: "fashion_retail",
      capabilities: [
        "core_pos", "inventory", "customers", "reports", "attendance",
        "finance_withdrawal", "product_variants", "multi_pricing", "returns_exchanges",
      ],
      role: "owner",
    })
  );
}

function resultRecord(type: "return" | "exchange", quantity: number) {
  return {
    id: "77777777-7777-7777-7777-777777777777",
    returnNumber: type === "return" ? "RET-20260914-ABC12345" : "EXC-20260914-ABC12345",
    idempotencyKey: "server-key",
    transactionId,
    transactionNumber: transaction.noTrx,
    type,
    reason: type === "return" ? "Ukuran tidak sesuai" : "Tukar ukuran",
    notes: "",
    refundAmount: type === "return" ? 100000 * quantity : 0,
    createdByUserId: owner.id,
    createdByName: owner.nama,
    createdAt: "2026-09-14T10:00:00Z",
    items: [
      {
        id: "88888888-8888-8888-8888-888888888888",
        transactionItemId,
        productId,
        productName: "Kaos Oversize",
        originalVariantId,
        originalVariantSku: "TSHIRT-BLK-M",
        originalVariantLabel: "Black / M",
        quantity,
        originalUnitPrice: 100000,
        refundAmount: type === "return" ? 100000 * quantity : 0,
        restock: true,
        replacementVariantId: type === "exchange" ? replacementVariantId : null,
        replacementVariantSku: type === "exchange" ? "TSHIRT-BLK-L" : "",
        replacementVariantLabel: type === "exchange" ? "Black / L" : "",
      },
    ],
  };
}

async function mockReturnsApi(page: Page, capture: (payload: Record<string, unknown>) => void) {
  let history: ReturnType<typeof resultRecord>[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    if (path === "/api/transactions" && request.method() === "GET") return json(route, [transaction]);
    if (path === "/api/retail/catalog") return json(route, catalog);
    if (path === "/api/retail/returns" && request.method() === "GET") return json(route, history);
    if (path === "/api/retail/returns" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      capture(payload);
      const type = payload.type as "return" | "exchange";
      const line = (payload.items as Array<{ quantity: number }>)[0];
      const result = resultRecord(type, line.quantity);
      history = [result];
      return json(route, result);
    }
    return json(route, {});
  });
}

test("fashion owner records a partial return without mutating the original sale", async ({ page }) => {
  await returnsSession(page);
  let payload: Record<string, unknown> | null = null;
  await mockReturnsApi(page, (value) => { payload = value; });

  await page.goto("/retail/returns", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Retur & Tukar" })).toBeVisible();
  await page.getByRole("button", { name: `Pilih ${transaction.noTrx}` }).click();
  await page.getByLabel("Pilih Kaos Oversize").check();
  await page.getByLabel("Quantity retur Kaos Oversize").fill("2");
  await page.getByLabel("Alasan").fill("Ukuran tidak sesuai");
  await page.getByRole("button", { name: "Simpan Retur" }).click();

  await expect(page.getByRole("status")).toContainText("RET-20260914-ABC12345 berhasil dicatat");
  await expect(page.getByText(/tidak otomatis mengirim refund/i)).toBeVisible();
  expect(payload).not.toBeNull();
  expect(payload).toMatchObject({ transactionId, type: "return", reason: "Ukuran tidak sesuai" });
  expect((payload as { idempotencyKey: string }).idempotencyKey).toBeTruthy();
  expect((payload as { items: Array<Record<string, unknown>> }).items[0]).toMatchObject({
    transactionItemId,
    quantity: 2,
    restock: true,
    replacementVariantId: null,
  });
});

test("fashion owner exchanges the sold variant for a sibling variant", async ({ page }) => {
  await returnsSession(page);
  let payload: Record<string, unknown> | null = null;
  await mockReturnsApi(page, (value) => { payload = value; });

  await page.goto("/retail/returns", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: `Pilih ${transaction.noTrx}` }).click();
  await page.getByLabel("Jenis proses").selectOption("exchange");
  await page.getByLabel("Pilih Kaos Oversize").check();
  await page.getByLabel("Quantity retur Kaos Oversize").fill("1");
  await page.getByLabel("Varian pengganti Kaos Oversize").selectOption(replacementVariantId);
  await page.getByLabel("Alasan").fill("Tukar ukuran");
  await page.getByRole("button", { name: "Simpan Tukar" }).click();

  await expect(page.getByRole("status")).toContainText("EXC-20260914-ABC12345 berhasil dicatat");
  expect(payload).not.toBeNull();
  expect(payload).toMatchObject({ transactionId, type: "exchange" });
  expect((payload as { items: Array<Record<string, unknown>> }).items[0]).toMatchObject({
    transactionItemId,
    quantity: 1,
    restock: true,
    replacementVariantId,
  });
});

test("returns page recovers from temporary catalog failure on tablet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Tablet Chromium", "Tablet retry contract only.");
  await returnsSession(page);
  let catalogCalls = 0;
  await page.route("**/api/transactions**", (route) => json(route, [transaction]));
  await page.route("**/api/retail/catalog", (route) => {
    catalogCalls += 1;
    return catalogCalls === 1
      ? json(route, { message: "Temporary failure" }, 500)
      : json(route, catalog);
  });
  await page.route("**/api/**", (route) => route.fallback());

  await page.goto("/retail/returns", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("Data retur belum dapat dimuat");
  const beforeRetry = catalogCalls;
  await page.getByRole("button", { name: "Coba Lagi" }).click();
  await expect(page.getByRole("button", { name: `Pilih ${transaction.noTrx}` })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(catalogCalls).toBeGreaterThan(beforeRetry);
});
