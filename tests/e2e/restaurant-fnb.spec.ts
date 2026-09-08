import {
  expect,
  test,
  type Page,
  type Route,
} from "@playwright/test";

import { commonTenantCapabilities } from "./tenantContextFixture";

const owner = {
  id: "11111111-1111-1111-1111-111111111111",
  nama: "Owner FNB",
  username: "owner",
  role: "owner",
};

const tableId = "22222222-2222-2222-2222-222222222222";
const orderId = "33333333-3333-3333-3333-333333333333";
const itemId = "44444444-4444-4444-4444-444444444444";
const productId = "55555555-5555-5555-5555-555555555555";
const transactionId = "66666666-6666-6666-6666-666666666666";

const product = {
  id: productId,
  kode: "KOPI-01",
  barcode: "8990001",
  nama: "Es Kopi Susu",
  kategori: "Minuman",
  hargaJual: 18000,
  stok: 50,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function tenantSession(
  page: Page,
  foodBeverage = true
) {
  await page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "restaurant-token");
  });

  await page.route("**/api/auth/me", (route) =>
    json(route, owner)
  );

  await page.route("**/api/tenant/context", (route) =>
    json(route, {
      tenantId: "99999999-9999-9999-9999-999999999999",
      namaToko: "NeverFade FNB QA",
      businessType: foodBeverage
        ? "food_beverage"
        : "general_retail",
      capabilities: foodBeverage
        ? [
            ...commonTenantCapabilities,
            "table_orders",
            "kitchen_queue",
          ]
        : commonTenantCapabilities,
      role: "owner",
    })
  );
}

test(
  "restaurant table order reaches existing cash checkout and closes after paid transaction",
  async ({ page }) => {
    await tenantSession(page);

    let order: {
      id: string;
      orderNumber: string;
      tableId: string;
      tableCode: string;
      tableName: string;
      status: "open" | "closed";
      transactionId: string | null;
      cancellationReason: null;
      openedAt: string;
      updatedAt: string;
      closedAt: string | null;
      cancelledAt: null;
      subtotal: number;
      items: Array<{
        id: string;
        productId: string;
        nama: string;
        hargaJual: number;
        qty: number;
        subtotal: number;
        note: string;
        kitchenStatus: "draft" | "queued";
        createdAt: string;
        queuedAt: string | null;
        preparingAt: null;
        readyAt: null;
        servedAt: null;
      }>;
    } | null = null;

    let closeCalls = 0;

    function tables() {
      return [
        {
          id: tableId,
          code: "A1",
          name: "Meja A1",
          capacity: 4,
          active: true,
          sortOrder: 1,
          status: order?.status === "open"
            ? "occupied"
            : "available",
          openOrderId: order?.status === "open"
            ? order.id
            : null,
          openOrderNumber: order?.status === "open"
            ? order.orderNumber
            : null,
          openOrderSubtotal: order?.status === "open"
            ? order.subtotal
            : 0,
          kitchenPendingItems:
            order?.items.filter(
              (item) => item.kitchenStatus === "queued"
            ).length ?? 0,
        },
      ];
    }

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (
        path === "/api/auth/me" ||
        path === "/api/tenant/context"
      ) {
        return route.fallback();
      }

      if (
        path === "/api/restaurant/tables" &&
        request.method() === "GET"
      ) {
        return json(route, tables());
      }

      if (
        path === "/api/restaurant/orders" &&
        request.method() === "POST"
      ) {
        order = {
          id: orderId,
          orderNumber: "FNB-QA-001",
          tableId,
          tableCode: "A1",
          tableName: "Meja A1",
          status: "open",
          transactionId: null,
          cancellationReason: null,
          openedAt: "2026-09-08T05:00:00Z",
          updatedAt: "2026-09-08T05:00:00Z",
          closedAt: null,
          cancelledAt: null,
          subtotal: 0,
          items: [],
        };

        return json(route, order);
      }

      if (
        path === `/api/restaurant/orders/${orderId}` &&
        request.method() === "GET"
      ) {
        return order
          ? json(route, order)
          : json(route, { message: "not found" }, 404);
      }

      if (
        path === `/api/restaurant/orders/${orderId}/items` &&
        request.method() === "POST"
      ) {
        const payload = request.postDataJSON() as {
          productId: string;
          qty: number;
          note: string;
        };

        if (!order) {
          return json(route, { message: "no order" }, 404);
        }

        order.items = [
          {
            id: itemId,
            productId: payload.productId,
            nama: product.nama,
            hargaJual: product.hargaJual,
            qty: payload.qty,
            subtotal: product.hargaJual * payload.qty,
            note: payload.note,
            kitchenStatus: "draft",
            createdAt: "2026-09-08T05:01:00Z",
            queuedAt: null,
            preparingAt: null,
            readyAt: null,
            servedAt: null,
          },
        ];
        order.subtotal = product.hargaJual * payload.qty;

        return json(route, order);
      }

      if (
        path ===
          `/api/restaurant/orders/${orderId}/send-to-kitchen` &&
        request.method() === "POST"
      ) {
        if (!order) {
          return json(route, { message: "no order" }, 404);
        }

        order.items = order.items.map((item) => ({
          ...item,
          kitchenStatus: "queued",
          queuedAt: "2026-09-08T05:02:00Z",
        }));

        return json(route, order);
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
          headerStruk: "",
          footerStruk: "",
        });
      }

      if (path === "/api/payments/capabilities") {
        return json(route, {
          qrisEnabled: false,
          mode: "disabled",
          isSandbox: false,
        });
      }

      if (
        path === "/api/transactions" &&
        request.method() === "POST"
      ) {
        const payload = request.postDataJSON() as {
          subtotal: number;
          total: number;
          dibayar: number;
          kembalian: number;
          metodePembayaran: string;
          items: unknown[];
        };

        return json(route, {
          id: transactionId,
          transactionId,
          createdAt: "2026-09-08T05:10:00Z",
          transactionDate: "2026-09-08T05:10:00Z",
          noTrx: "TRX-QA-001",
          subtotal: payload.subtotal,
          discAmt: 0,
          taxAmt: 0,
          total: payload.total,
          dibayar: payload.dibayar,
          kembalian: payload.kembalian,
          metodePembayaran: payload.metodePembayaran,
          items: payload.items,
        });
      }

      if (
        path ===
          `/api/restaurant/orders/${orderId}/close` &&
        request.method() === "POST"
      ) {
        closeCalls += 1;

        const payload = request.postDataJSON() as {
          transactionId: string;
        };

        expect(payload.transactionId).toBe(transactionId);

        if (!order) {
          return json(route, { message: "no order" }, 404);
        }

        order = {
          ...order,
          status: "closed",
          transactionId,
          closedAt: "2026-09-08T05:10:01Z",
        };

        return json(route, order);
      }

      return json(route, {});
    });

    await page.goto("/meja");

    await expect(
      page.getByRole("heading", {
        name: "Meja & Pesanan",
        exact: true,
      })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Buka Pesanan" })
      .click();

    await page
      .getByLabel("Catatan item berikutnya")
      .fill("Tanpa es");

    const productCard = page
      .locator(".restaurant-product-card")
      .filter({ hasText: "Es Kopi Susu" });

    await productCard
      .getByRole("button", { name: "Tambah" })
      .click();

    await expect(
      page.getByText("Tanpa es", { exact: true })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Kirim Draft ke Dapur" })
      .click();

    await expect(
      page.getByText("Antre", { exact: true })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Bayar di Kasir" })
      .click();

    await expect(page).toHaveURL(/\/kasir\?restaurantOrder=/);

    await expect(
      page.getByText("Pesanan meja · Meja A1", {
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByText("Es Kopi Susu", { exact: true }).first()
    ).toBeVisible();

    await page.getByLabel("Uang Diterima").fill("18000");

    await page
      .getByRole("button", { name: /Proses Transaksi/ })
      .click();

    await expect.poll(() => closeCalls).toBe(1);

    await expect.poll(async () =>
      page.evaluate(() =>
        localStorage.getItem("nfpos_restaurant_checkout")
      )
    ).toBeNull();
  }
);

test(
  "kitchen queue advances queued to preparing to ready to served",
  async ({ page }) => {
    await tenantSession(page);

    let status: "queued" | "preparing" | "ready" | "served" =
      "queued";

    function queue() {
      if (status === "served") {
        return [];
      }

      return [
        {
          orderId,
          orderNumber: "FNB-QA-002",
          tableId,
          tableCode: "A1",
          tableName: "Meja A1",
          openedAt: "2026-09-08T05:00:00Z",
          items: [
            {
              id: itemId,
              productId,
              nama: "Es Kopi Susu",
              hargaJual: 18000,
              qty: 2,
              subtotal: 36000,
              note: "Less sugar",
              kitchenStatus: status,
              createdAt: "2026-09-08T05:01:00Z",
              queuedAt: "2026-09-08T05:02:00Z",
              preparingAt:
                status === "preparing" ||
                status === "ready"
                  ? "2026-09-08T05:03:00Z"
                  : null,
              readyAt:
                status === "ready"
                  ? "2026-09-08T05:04:00Z"
                  : null,
              servedAt: null,
            },
          ],
        },
      ];
    }

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (
        path === "/api/auth/me" ||
        path === "/api/tenant/context"
      ) {
        return route.fallback();
      }

      if (
        path === "/api/restaurant/kitchen" &&
        request.method() === "GET"
      ) {
        return json(route, queue());
      }

      if (
        path ===
          `/api/restaurant/kitchen/items/${itemId}/status` &&
        request.method() === "POST"
      ) {
        const payload = request.postDataJSON() as {
          status: typeof status;
        };
        status = payload.status;
        return json(route, {
          ...queue()[0]?.items[0],
          kitchenStatus: status,
        });
      }

      return json(route, []);
    });

    await page.goto("/dapur");

    await expect(
      page.getByRole("heading", {
        name: "Dapur",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByText("Less sugar", { exact: false })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Mulai Masak" })
      .click();

    await expect(
      page.getByText("Dimasak", { exact: true })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Tandai Siap" })
      .click();

    await expect(
      page.getByText("Siap", { exact: true })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Sudah Disajikan" })
      .click();

    await expect(
      page.getByText("Tidak ada item di antrean ini")
    ).toBeVisible();
  }
);

test(
  "general retail hides and blocks restaurant routes",
  async ({ page }) => {
    await tenantSession(page, false);

    await page.route("**/api/products", (route) =>
      json(route, [])
    );

    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;

      if (
        path === "/api/auth/me" ||
        path === "/api/tenant/context" ||
        path === "/api/products"
      ) {
        return route.fallback();
      }

      return json(route, []);
    });

    await page.goto("/produk");

    await expect(
      page.getByRole("heading", {
        name: "Produk",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "Meja",
        exact: true,
      })
    ).toHaveCount(0);

    await expect(
      page.getByRole("link", {
        name: "Dapur",
        exact: true,
      })
    ).toHaveCount(0);

    await page.goto("/meja");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dapur");
    await expect(page).toHaveURL(/\/dashboard$/);
  }
);
