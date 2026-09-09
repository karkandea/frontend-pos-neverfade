import {
  expect,
  test,
  type Page,
  type Route,
} from "@playwright/test";

import { commonTenantCapabilities } from "./tenantContextFixture";

const owner = {
  id: "11111111-1111-1111-1111-111111111111",
  nama: "Owner Laundry",
  username: "owner",
  role: "owner",
};

const customerId =
  "22222222-2222-2222-2222-222222222222";
const productId =
  "33333333-3333-3333-3333-333333333333";
const workOrderId =
  "44444444-4444-4444-4444-444444444444";
const transactionId =
  "55555555-5555-5555-5555-555555555555";

const product = {
  id: productId,
  kode: "LDR-KG-01",
  barcode: "",
  nama: "Cuci Kering",
  kategori: "Laundry",
  hargaModal: 0,
  hargaJual: 10000,
  stok: 0,
  supplier: "",
  satuan: "kg",
  deskripsi: "Jasa laundry per kg",
  type: "service" as const,
  tracksStock: false,
  quantityPrecision: 2,
};

const customer = {
  id: customerId,
  nama: "Budi Laundry",
  hp: "081234567890",
};

function json(
  route: Route,
  body: unknown,
  status = 200
) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function tenantSession(
  page: Page,
  laundry = true
) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "nfpos_token",
      "laundry-token"
    );
  });

  await page.route(
    "**/api/auth/me",
    (route) => json(route, owner)
  );

  await page.route(
    "**/api/tenant/context",
    (route) =>
      json(route, {
        tenantId:
          "99999999-9999-9999-9999-999999999999",
        namaToko:
          "NeverFade Laundry QA",
        businessType: laundry
          ? "laundry"
          : "general_retail",
        capabilities: laundry
          ? [
              ...commonTenantCapabilities,
              "work_orders",
            ]
          : commonTenantCapabilities,
        role: "owner",
      })
  );
}

test(
  "laundry decimal work order reaches existing cash checkout and links exactly once",
  async ({ page }) => {
    await tenantSession(page);

    let order:
      | {
          id: string;
          orderNumber: string;
          customerId: string;
          customerName: string;
          customerPhone: string;
          status:
            | "received"
            | "in_progress"
            | "ready"
            | "completed";
          paymentStatus:
            | "unpaid"
            | "paid";
          transactionId: string | null;
          total: number;
          notes: string;
          cancellationReason: null;
          receivedAt: string;
          promisedAt: string;
          updatedAt: string;
          paidAt: string | null;
          completedAt: null;
          cancelledAt: null;
          items: Array<{
            id: string;
            productId: string;
            nama: string;
            productType: "service";
            unit: string;
            quantity: number;
            quantityPrecision: number;
            unitPrice: number;
            subtotal: number;
          }>;
          statusHistory: Array<{
            id: string;
            fromStatus: string;
            toStatus:
              | "received"
              | "in_progress"
              | "ready";
            actorName: string;
            reason: string;
            at: string;
          }>;
        }
      | null = null;

    let paymentLinkCalls = 0;

    await page.route(
      "**/api/**",
      async (route) => {
        const request =
          route.request();
        const path =
          new URL(
            request.url()
          ).pathname;

        if (
          path === "/api/auth/me" ||
          path ===
            "/api/tenant/context"
        ) {
          return route.fallback();
        }

        if (
          path ===
            "/api/laundry/work-orders" &&
          request.method() === "GET"
        ) {
          return json(
            route,
            order ? [order] : []
          );
        }

        if (
          path ===
            "/api/laundry/work-orders" &&
          request.method() === "POST"
        ) {
          const payload =
            request.postDataJSON() as {
              customerId: string;
              promisedAt: string;
              notes: string;
              items: Array<{
                productId: string;
                quantity: number;
              }>;
            };

          expect(
            payload.customerId
          ).toBe(customerId);
          expect(
            payload.items
          ).toEqual([
            {
              productId,
              quantity: 2.5,
            },
          ]);

          order = {
            id: workOrderId,
            orderNumber:
              "LDR-QA-001",
            customerId,
            customerName:
              customer.nama,
            customerPhone:
              customer.hp,
            status: "received",
            paymentStatus:
              "unpaid",
            transactionId: null,
            total: 25000,
            notes: payload.notes,
            cancellationReason: null,
            receivedAt:
              "2026-09-08T10:00:00Z",
            promisedAt:
              payload.promisedAt,
            updatedAt:
              "2026-09-08T10:00:00Z",
            paidAt: null,
            completedAt: null,
            cancelledAt: null,
            items: [
              {
                id:
                  "66666666-6666-6666-6666-666666666666",
                productId,
                nama: product.nama,
                productType:
                  "service",
                unit: "kg",
                quantity: 2.5,
                quantityPrecision: 2,
                unitPrice: 10000,
                subtotal: 25000,
              },
            ],
            statusHistory: [
              {
                id:
                  "77777777-7777-7777-7777-777777777777",
                fromStatus: "",
                toStatus:
                  "received",
                actorName:
                  owner.nama,
                reason:
                  "Pesanan diterima.",
                at:
                  "2026-09-08T10:00:00Z",
              },
            ],
          };

          return json(
            route,
            order
          );
        }

        if (
          path ===
            "/api/laundry/work-orders/" +
              workOrderId &&
          request.method() === "GET"
        ) {
          return order
            ? json(route, order)
            : json(
                route,
                {
                  message:
                    "not found",
                },
                404
              );
        }

        if (
          path ===
            "/api/laundry/work-orders/" +
              workOrderId +
              "/status" &&
          request.method() === "POST"
        ) {
          if (!order) {
            return json(
              route,
              {
                message:
                  "no order",
              },
              404
            );
          }

          const payload =
            request.postDataJSON() as {
              status:
                | "in_progress"
                | "ready";
              reason: string;
            };

          order = {
            ...order,
            status:
              payload.status,
            updatedAt:
              "2026-09-08T10:05:00Z",
            statusHistory: [
              ...order.statusHistory,
              {
                id:
                  crypto.randomUUID(),
                fromStatus:
                  order.status,
                toStatus:
                  payload.status,
                actorName:
                  owner.nama,
                reason:
                  payload.reason,
                at:
                  "2026-09-08T10:05:00Z",
              },
            ],
          };

          return json(
            route,
            order
          );
        }

        if (
          path ===
            "/api/laundry/work-orders/" +
              workOrderId +
              "/complete-payment" &&
          request.method() === "POST"
        ) {
          paymentLinkCalls += 1;

          const payload =
            request.postDataJSON() as {
              transactionId: string;
            };

          expect(
            payload.transactionId
          ).toBe(transactionId);

          if (!order) {
            return json(
              route,
              {
                message:
                  "no order",
              },
              404
            );
          }

          order = {
            ...order,
            paymentStatus:
              "paid",
            transactionId,
            paidAt:
              "2026-09-08T10:10:00Z",
          };

          return json(
            route,
            order
          );
        }

        if (
          path ===
          "/api/customers"
        ) {
          return json(
            route,
            [customer]
          );
        }

        if (
          path ===
          "/api/products"
        ) {
          return json(
            route,
            [product]
          );
        }

        if (
          path ===
          "/api/settings"
        ) {
          return json(
            route,
            {
              defaultTax: 0,
              headerStruk: "",
              footerStruk: "",
            }
          );
        }

        if (
          path ===
          "/api/payments/capabilities"
        ) {
          return json(
            route,
            {
              qrisEnabled:
                false,
              mode:
                "disabled",
              isSandbox:
                false,
            }
          );
        }

        if (
          path ===
            "/api/transactions" &&
          request.method() === "POST"
        ) {
          const payload =
            request.postDataJSON() as {
              customerId:
                | string
                | null;
              disc: number;
              tax: number;
              subtotal: number;
              total: number;
              dibayar: number;
              kembalian: number;
              metodePembayaran:
                string;
              items: Array<{
                id: string;
                qty: number;
                quantity: number;
                subtotal: number;
              }>;
            };

          expect(
            payload.customerId
          ).toBe(customerId);
          expect(payload.disc).toBe(0);
          expect(payload.tax).toBe(0);
          expect(
            payload.items
          ).toEqual([
            expect.objectContaining({
              id: productId,
              qty: 1,
              quantity: 2.5,
              subtotal: 25000,
            }),
          ]);

          return json(
            route,
            {
              id:
                transactionId,
              transactionId,
              createdAt:
                "2026-09-08T10:10:00Z",
              noTrx:
                "TRX-LDR-QA-001",
              subtotal:
                payload.subtotal,
              discAmt: 0,
              taxAmt: 0,
              total:
                payload.total,
              dibayar:
                payload.dibayar,
              kembalian:
                payload.kembalian,
              metodePembayaran:
                payload.metodePembayaran,
              items: [
                {
                  id:
                    productId,
                  nama:
                    product.nama,
                  hargaJual:
                    10000,
                  qty: 1,
                  quantity: 2.5,
                  productType:
                    "service",
                  tracksStock:
                    false,
                  quantityPrecision:
                    2,
                  unit: "kg",
                  subtotal:
                    25000,
                },
              ],
            }
          );
        }

        return json(route, {});
      }
    );

    await page.goto(
      "/laundry"
    );

    await expect(
      page.getByRole(
        "heading",
        {
          name:
            "Pesanan Laundry",
        }
      )
    ).toBeVisible();

    await page
      .getByRole(
        "button",
        {
          name:
            "Pesanan Baru",
        }
      )
      .click();

    await page
      .getByLabel(
        "Pelanggan"
      )
      .selectOption(
        customerId
      );

    await page
      .getByLabel(
        "Produk / layanan"
      )
      .selectOption(
        productId
      );

    await page
      .getByLabel(
        "Jumlah (kg)"
      )
      .fill("2.5");

    await page
      .getByRole(
        "button",
        {
          name:
            "Tambah Item",
        }
      )
      .click();

    await page
      .getByRole(
        "button",
        {
          name:
            "Simpan Pesanan",
        }
      )
      .click();

    await expect(
      page.getByText(
        "LDR-QA-001",
        { exact: true }
      )
    ).toBeVisible();

    await page
      .getByRole(
        "button",
        {
          name:
            "Mulai Kerjakan",
        }
      )
      .click();

    await page
      .getByRole(
        "button",
        {
          name:
            "Tandai Siap",
        }
      )
      .click();

    await expect(
      page.getByText(
        "Siap Diambil",
        { exact: true }
      ).first()
    ).toBeVisible();

    await page
      .getByRole(
        "button",
        {
          name:
            "Bayar di Kasir",
        }
      )
      .click();

    await expect(
      page
    ).toHaveURL(/\/kasir$/);

    await expect(
      page.getByText(
        "Pesanan laundry · LDR-QA-001",
        { exact: true }
      )
    ).toBeVisible();

    const mobileCartDock =
      page.getByRole(
        "button",
        {
          name:
            /Buka keranjang/,
        }
      );

    if (
      await mobileCartDock.isVisible()
    ) {
      await mobileCartDock.click();
    }

    await expect(
      page.getByText(
        "2.5 kg",
        { exact: true }
      )
    ).toBeVisible();

    await expect(
      page.getByLabel(
        "Pelanggan"
      )
    ).toBeDisabled();

    await page
      .getByLabel(
        "Uang Diterima"
      )
      .fill("25000");

    await page
      .getByRole(
        "button",
        {
          name:
            /Proses Transaksi/,
        }
      )
      .click();

    await expect
      .poll(
        () =>
          paymentLinkCalls
      )
      .toBe(1);

    await expect.poll(
      async () =>
        page.evaluate(
          () =>
            localStorage.getItem(
              "nfpos_laundry_checkout"
            )
        )
    ).toBeNull();
  }
);

test(
  "laundry page recovers from temporary API failure on tablet",
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Tablet Chromium",
      "Error/retry acceptance is required on the tablet-sized viewport."
    );

    await tenantSession(page);

    let orderListCalls = 0;

    await page.route(
      "**/api/**",
      async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;

        if (
          path === "/api/auth/me" ||
          path === "/api/tenant/context"
        ) {
          return route.fallback();
        }

        if (
          path === "/api/laundry/work-orders" &&
          request.method() === "GET"
        ) {
          orderListCalls += 1;

          if (orderListCalls === 1) {
            return json(
              route,
              {
                message:
                  "Layanan laundry sementara tidak tersedia.",
              },
              500
            );
          }

          return json(route, []);
        }

        if (
          path === "/api/customers" ||
          path === "/api/products"
        ) {
          return json(route, []);
        }

        return json(route, {});
      }
    );

    await page.goto("/laundry");

    await expect(
      page.getByRole("alert")
    ).toContainText(
      "Layanan laundry sementara tidak tersedia."
    );

    const callsBeforeRetry =
      orderListCalls;

    await page
      .getByRole("button", {
        name: "Coba Lagi",
      })
      .click();

    await expect.poll(
      () => orderListCalls
    ).toBeGreaterThan(
      callsBeforeRetry
    );

    await expect(
      page.getByText(
        "Belum ada pesanan pada status ini.",
        { exact: true }
      )
    ).toBeVisible();
  }
);

test(
  "laundry WhatsApp action normalizes phone and only prefills a message",
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Desktop Chromium",
      "WhatsApp handoff contract is verified once on desktop."
    );

    await tenantSession(page);

    const readyOrder = {
      id: workOrderId,
      orderNumber: "LDR-WA-001",
      customerId,
      customerName: customer.nama,
      customerPhone: "081234567890",
      status: "ready",
      paymentStatus: "unpaid",
      transactionId: null,
      total: 25000,
      notes: "",
      cancellationReason: null,
      receivedAt: "2026-09-08T10:00:00Z",
      promisedAt: "2099-09-08T12:00:00Z",
      updatedAt: "2026-09-08T11:00:00Z",
      paidAt: null,
      completedAt: null,
      cancelledAt: null,
      items: [
        {
          id: "88888888-8888-8888-8888-888888888888",
          productId,
          nama: product.nama,
          productType: "service",
          unit: "kg",
          quantity: 2.5,
          quantityPrecision: 2,
          unitPrice: 10000,
          subtotal: 25000,
        },
      ],
      statusHistory: [],
    };

    await page.route(
      "**/api/**",
      async (route) => {
        const path =
          new URL(
            route.request().url()
          ).pathname;

        if (
          path === "/api/auth/me" ||
          path === "/api/tenant/context"
        ) {
          return route.fallback();
        }

        if (
          path === "/api/laundry/work-orders"
        ) {
          return json(
            route,
            [readyOrder]
          );
        }

        if (
          path === "/api/customers"
        ) {
          return json(
            route,
            [customer]
          );
        }

        if (
          path === "/api/products"
        ) {
          return json(
            route,
            [product]
          );
        }

        return json(route, {});
      }
    );

    await page.goto("/laundry");

    await page.evaluate(() => {
      window.open = ((
        url?: string | URL
      ) => {
        sessionStorage.setItem(
          "qa-whatsapp-url",
          String(url ?? "")
        );

        return null;
      }) as typeof window.open;
    });

    await page
      .getByRole("button", {
        name: "WhatsApp Pelanggan",
      })
      .click();

    const openedUrl =
      await page.evaluate(
        () =>
          sessionStorage.getItem(
            "qa-whatsapp-url"
          ) ?? ""
      );

    expect(openedUrl).toContain(
      "https://wa.me/6281234567890?text="
    );

    const decoded =
      decodeURIComponent(openedUrl);

    expect(decoded).toContain(
      "LDR-WA-001"
    );
    expect(decoded).toContain(
      "sudah selesai dan siap diambil"
    );
    expect(decoded).not.toContain(
      "terkirim"
    );
    expect(decoded).not.toContain(
      "sudah dikirim"
    );
  }
);

test(
  "general retail hides and blocks laundry route",
  async ({ page }) => {
    await tenantSession(
      page,
      false
    );

    await page.route(
      "**/api/products",
      (route) =>
        json(route, [])
    );

    await page.route(
      "**/api/**",
      async (route) => {
        const path =
          new URL(
            route
              .request()
              .url()
          ).pathname;

        if (
          path ===
            "/api/auth/me" ||
          path ===
            "/api/tenant/context" ||
          path ===
            "/api/products"
        ) {
          return route.fallback();
        }

        return json(
          route,
          []
        );
      }
    );

    await page.goto(
      "/produk"
    );

    await expect(
      page.getByRole(
        "heading",
        {
          name:
            "Produk",
          exact: true,
        }
      )
    ).toBeVisible();

    await expect(
      page.getByRole(
        "link",
        {
          name:
            "Laundry",
          exact: true,
        }
      )
    ).toHaveCount(0);

    await page.goto(
      "/laundry"
    );

    await expect(
      page
    ).toHaveURL(
      /\/dashboard$/
    );
  }
);
