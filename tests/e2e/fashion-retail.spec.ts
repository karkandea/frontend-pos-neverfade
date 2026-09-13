import {
  expect,
  test,
  type Page,
  type Route,
} from "@playwright/test";

const owner = {
  id: "11111111-1111-1111-1111-111111111111",
  nama: "Owner Fashion",
  username: "owner",
  role: "owner",
};

const productId = "22222222-2222-2222-2222-222222222222";
const variantId = "33333333-3333-3333-3333-333333333333";
const wholesaleId = "44444444-4444-4444-4444-444444444444";
const resellerId = "55555555-5555-5555-5555-555555555555";
const catalog = {
  priceLevels: [
    { id: wholesaleId, code: "grosir", name: "Grosir", sortOrder: 1, active: true },
    { id: resellerId, code: "reseller", name: "Reseller", sortOrder: 2, active: true },
  ],
  products: [
    {
      id: productId,
      kode: "TSHIRT",
      barcode: "",
      nama: "Kaos Oversize",
      kategori: "Fashion",
      hargaModal: 50000,
      hargaJual: 100000,
      stok: 10,
      supplier: "QA",
      satuan: "pcs",
      deskripsi: "",
      type: "goods",
      tracksStock: true,
      quantityPrecision: 0,
      variants: [
        {
          id: variantId,
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
          stok: 10,
          active: true,
        },
      ],
      prices: [
        {
          id: "66666666-6666-6666-6666-666666666666",
          productId,
          productVariantId: null,
          priceLevelId: wholesaleId,
          priceLevelCode: "grosir",
          priceLevelName: "Grosir",
          priceLevelSortOrder: 1,
          minQuantity: 6,
          unitPrice: 85000,
        },
        {
          id: "77777777-7777-7777-7777-777777777777",
          productId,
          productVariantId: null,
          priceLevelId: resellerId,
          priceLevelCode: "reseller",
          priceLevelName: "Reseller",
          priceLevelSortOrder: 2,
          minQuantity: 999,
          unitPrice: 80000,
        },
      ],
    },
  ],
};
function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function fashionSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "fashion-token");
  });

  await page.route("**/api/auth/me", (route) => json(route, owner));
  await page.route("**/api/tenant/context", (route) =>
    json(route, {
      tenantId: "99999999-9999-9999-9999-999999999999",
      namaToko: "NeverFade Fashion QA",
      businessType: "fashion_retail",
      capabilities: [
        "core_pos", "inventory", "customers", "reports",
        "attendance", "finance_withdrawal",
        "product_variants", "multi_pricing",
      ],
      role: "owner",
    })
  );
}
test("fashion checkout uses variant and price-level snapshots", async ({ page }, testInfo) => {
  await fashionSession(page);
  let transactionPayload: Record<string, unknown> | null = null;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me" || path === "/api/tenant/context") return route.fallback();
    if (path === "/api/retail/catalog") return json(route, catalog);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") return json(route, { defaultTax: 0, headerStruk: "QA", footerStruk: "QA" });
    if (path === "/api/payments/capabilities") return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    if (path === "/api/transactions" && request.method() === "POST") {
      transactionPayload = request.postDataJSON() as Record<string, unknown>;
      return json(route, {
        id: "88888888-8888-8888-8888-888888888888",
        noTrx: "TRX-FASHION-001",
        createdAt: "2026-09-13T11:00:00Z",
        subtotal: 480000, discAmt: 0, taxAmt: 0, total: 480000,
        dibayar: 480000, kembalian: 0, metodePembayaran: "tunai",
        items: [],
      });
    }
    return json(route, {});
  });

  await page.goto("/kasir");
  const add = page.getByRole("button", { name: "Tambah Kaos Oversize · Black / M ke keranjang" });
  await expect(add).toBeVisible();
  await add.click();

  const qty = page.getByLabel("Jumlah Kaos Oversize · Black / M. Ketik jumlah langsung.");
  await qty.fill("6");
  await qty.press("Enter");
  if (testInfo.project.name === "Mobile Chromium") {
    await page.getByRole("button", { name: /Buka keranjang/ }).click();
  }
  await expect(page.getByText(/Rp\s*85\.000 · Grosir/)).toBeVisible();

  await page.getByLabel("Level harga Kaos Oversize · Black / M").selectOption(resellerId);
  await expect(page.getByText(/Rp\s*80\.000 · Reseller/)).toBeVisible();
  await page.locator("#cash-received").fill("480000");
  await page.getByRole("button", { name: /Proses Transaksi/ }).click();
  await expect(page.getByRole("heading", { name: "Transaksi Berhasil" })).toBeVisible();

  expect(transactionPayload).not.toBeNull();
  const payload = transactionPayload as { items: Array<Record<string, unknown>>; subtotal: number; total: number };
  expect(payload.items[0]).toMatchObject({
    id: productId,
    productVariantId: variantId,
    priceLevelId: resellerId,
    qty: 6,
    quantity: 6,
    hargaJual: 80000,
    subtotal: 480000,
  });
  expect(payload.subtotal).toBe(480000);
  expect(payload.total).toBe(480000);
});

test("fashion variant pricing page recovers after temporary API failure", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Tablet Chromium", "Tablet retry contract only.");
  await fashionSession(page);
  let calls = 0;

  await page.route("**/api/retail/catalog", (route) => {
    calls += 1;
    return calls <= 2
      ? json(route, { message: "Temporary failure" }, 500)
      : json(route, catalog);
  });

  await page.goto("/retail/variants-pricing");
  await expect(page.getByRole("alert")).toContainText("Data varian & harga gagal dimuat");
  const callsBeforeRetry = calls;
  await page.getByRole("button", { name: "Coba Lagi" }).click();
  await expect(page.getByRole("heading", { name: "Varian & Harga" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Produk" })).toHaveValue(productId);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(calls).toBeGreaterThan(callsBeforeRetry);
});
