import { expect, test, type Page, type Route } from "@playwright/test";
import { commonTenantCapabilities, mockTenantContext } from "./tenantContextFixture";

const product = {
  id: "11111111-1111-4111-8111-111111111111", kode: "QA-03", nama: "Kopi QA",
  kategori: "Minuman", hargaModal: 10000, hargaJual: 25000, stok: 12,
  supplier: "", satuan: "pcs", deskripsi: "", type: "goods", tracksStock: true,
};
const receipt = {
  id: "22222222-2222-4222-8222-222222222222", noTrx: "TRX-20260924-0003",
  kasir: "QA Kasir", createdAt: "2026-09-24T02:00:00Z", subtotal: 25000,
  discAmt: 0, taxAmt: 0, total: 25000, dibayar: 25000, kembalian: 0,
  metodePembayaran: "tunai", items: [{ id: product.id, nama: "Kopi QA", qty: 1, hargaJual: 25000, subtotal: 25000 }],
};
function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
}
async function setup(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("nfpos_token", "phase03-test-token"));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return json(route, { id: "qa", nama: "QA", username: "qa", role: "owner" });
    if (path === "/api/products") return json(route, [product]);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") return json(route, { defaultTax: 0, headerStruk: "Neverfade QA", footerStruk: "Terima kasih" });
    if (path === "/api/payments/capabilities") return json(route, { qrisEnabled: false, mode: "disabled", isSandbox: false });
    if (path === "/api/payments/current") return route.fulfill({ status: 204, body: "" });
    if (path === "/api/transactions" && route.request().method() === "POST") return json(route, receipt);
    if (path.endsWith("/receipt/whatsapp/status")) return json(route, { configured: true, connected: true, status: "WORKING" });
    if (path.endsWith("/receipt/whatsapp")) return json(route, { message: "WhatsApp outlet belum dikonfigurasi." }, 409);
    return json(route, []);
  });
  await mockTenantContext(page, "owner", [...commonTenantCapabilities, "table_orders", "kitchen_queue"]);
}

test("product actions have one edit action and a separate delete menu on desktop and mobile", async ({ page }) => {
  await setup(page);
  await page.goto("/produk");
  const desktop = page.locator(".product-desktop-list");
  await expect(desktop.locator(".product-edit-button")).toHaveCount(1);
  await desktop.locator(".product-action-menu summary").click();
  await expect(desktop.locator(".product-action-popover button")).toHaveCount(1);
  await expect(desktop.locator(".product-action-popover")).toContainText("Hapus produk");
  await expect(desktop.locator(".product-action-popover")).not.toContainText("Edit produk");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.locator(".product-mobile-list");
  await mobile.locator(".product-action-menu summary").click();
  await expect(mobile.locator(".product-action-popover button")).toHaveCount(1);
  await expect(mobile.locator(".product-mobile-footer").getByRole("button", { name: "Edit" })).toHaveCount(1);
});

test("public customer is explained as optional for every business and member selection is retained", async ({ page }) => {
  await setup(page);
  await page.goto("/kasir");
  await expect(page.locator("#pos-customer")).toContainText("Pelanggan Umum");
  await expect(page.locator(".cart-customer-hint")).toContainText("berlaku di semua jenis usaha");
  await expect(page.locator(".cart-customer-hint")).toContainText("poin");
});

test("WhatsApp auto send failure offers a valid manual draft without claiming delivery", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { __openedWhatsApp?: string };
    window.open = ((url?: string | URL) => { state.__openedWhatsApp = String(url); return null; }) as typeof window.open;
  });
  await setup(page);
  await page.goto("/kasir");
  await page.getByRole("button", { name: "Tambah Kopi QA ke keranjang" }).click();
  await page.locator("#cash-received").fill("25000");
  await page.getByRole("button", { name: "Proses Transaksi" }).click();
  await page.getByRole("button", { name: "Lihat Struk" }).click();
  await page.getByRole("button", { name: "Kirim WhatsApp" }).click();
  await page.locator("#receipt-whatsapp-phone").fill("081234567890");
  await page.getByRole("button", { name: "Kirim Otomatis" }).click();
  await expect(page.getByText(/Nomor WhatsApp outlet belum dikonfigurasi/)).toBeVisible();
  await page.getByRole("button", { name: "Buka WhatsApp (manual)" }).click();
  const opened = await page.evaluate(() => (window as typeof window & { __openedWhatsApp?: string }).__openedWhatsApp);
  expect(opened).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  const text = new URL(opened!).searchParams.get("text") ?? "";
  expect(text).toContain("TRX-20260924-0003");
  expect(text).toContain("Kopi QA");
  expect(text.replace(/\s/g, "")).toContain("Rp25.000");
  await expect(page.getByText(/Struk berhasil dikirim/)).toHaveCount(0);
  await page.locator("#receipt-whatsapp-phone").fill("abc");
  await expect(page.getByRole("button", { name: "Buka WhatsApp (manual)" })).toBeDisabled();
});

test("restaurant table map displays occupancy and links to selected order panel", async ({ page }) => {
  await setup(page);
  const tables = [
    { id: "11111111-1111-4111-8111-111111111111", code: "A1", name: "Dekat Jendela", capacity: 4, active: true, sortOrder: 1, status: "available", openOrderId: null, openOrderNumber: null, openOrderSubtotal: 0, kitchenPendingItems: 0 },
    { id: "22222222-2222-4222-8222-222222222222", code: "A2", name: "Teras", capacity: 2, active: true, sortOrder: 2, status: "available", openOrderId: null, openOrderNumber: null, openOrderSubtotal: 0, kitchenPendingItems: 0 },
  ];
  await page.route("**/api/restaurant/tables", route => json(route, tables));
  await page.goto("/meja");
  await page.getByRole("button", { name: "Denah", exact: true }).click();
  const map = page.getByRole("group", { name: "Denah meja ringkas" });
  await expect(map.getByRole("button")).toHaveCount(2);
  await expect(map).toContainText("Dekat Jendela");
  await expect(map).toContainText("Teras");
  await expect(page.getByText(/Denah skematis mengikuti urutan meja/)).toBeVisible();
  await map.getByRole("button", { name: /A2, Teras/ }).click();
  await expect(map.getByRole("button", { name: /A2, Teras/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(page.locator(".restaurant-table-grid")).toBeVisible();
});


test("unconfigured outlet shows manual option before failing auto send", async ({ page }) => {
  await setup(page);
  await page.route("**/api/transactions/*/receipt/whatsapp/status", route =>
    json(route, { configured: false, connected: false, status: "NOT_CONFIGURED" }));
  await page.goto("/kasir");
  await page.getByRole("button", { name: "Tambah Kopi QA ke keranjang" }).click();
  await page.locator("#cash-received").fill("25000");
  await page.getByRole("button", { name: "Proses Transaksi" }).click();
  await page.getByRole("button", { name: "Lihat Struk" }).click();
  await page.getByRole("button", { name: "Kirim WhatsApp" }).click();
  await page.locator("#receipt-whatsapp-phone").fill("081234567890");
  await expect(page.getByRole("status")).toContainText("WhatsApp outlet belum tersambung");
  await expect(page.getByRole("button", { name: "Kirim Otomatis" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Buka WhatsApp (manual)" })).toBeEnabled();
  await expect(page.getByText(/Struk berhasil dikirim/)).toHaveCount(0);
});
