import { expect, test } from "@playwright/test";

// Opt-in only: touches a running disposable Sprint-1 API, never a shared demo/prod URL.
test.skip(process.env.NF_S1_LIVE_SMOKE !== "1", "Requires an isolated Sprint 1 QA database and API");

// Public QA uses an edge gate; local QA needs no extra authentication.
const gateUsername = process.env.NF_S1_QA_BASIC_USER;
if (gateUsername) {
  test.use({ httpCredentials: {
    username: gateUsername,
    password: process.env.NF_S1_QA_BASIC_PASS ?? "",
  } });
  test.beforeEach(async ({ page }) => {
    await page.goto("/qa-access");
    await expect(page).toHaveURL(/\/login$/);
  });
}

for (const role of ["owner", "admin", "kasir"] as const) {
  test(`isolated ${role} logs in and reaches the role landing`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill(role);
    await page.getByLabel("Password", { exact: true }).fill(`${role}123`);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(role === "kasir" ? /\/kasir$/ : /\/produk$/);
    await expect(page.getByText("Internal server error.")).toHaveCount(0);
  });
}

const categoryFixtures = [
  ["qa.resto", "food_beverage"],
  ["qa.fashion", "fashion_retail"],
  ["qa.laundry", "laundry"],
  ["qa.salon", "salon_barbershop"],
  ["qa.barber", "salon_barbershop"],
] as const;

test.describe("isolated category fixtures", () => {
  test.skip(process.env.NF_S1_CATEGORY_SMOKE !== "1", "Only for seeded isolated QA");
  for (const [username, businessType] of categoryFixtures) {
    test(`${username} opens its own category and role context`, async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Username").fill(username);
      await page.getByLabel("Password", { exact: true }).fill("owner123");
      await page.getByRole("button", { name: "Masuk" }).click();
      await expect(page).toHaveURL(/\/produk$/);
      const context = await page.evaluate(async () => {
        const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
        const response = await fetch("/api/tenant/context", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return { status: response.status, data: await response.json() };
      });
      expect(context.status).toBe(200);
      expect(context.data.businessType).toBe(businessType);
      if (businessType === "food_beverage") {
        await page.goto("/meja");
        await expect(page.getByRole("heading", { name: "Meja A1", exact: true })).toBeVisible();
      }
      if (businessType === "laundry") {
        await page.goto("/laundry");
        await expect(page.getByRole("heading", { name: "Pesanan Laundry" })).toBeVisible();
      }
    });
  }
});

test("isolated restaurant API sends an order to the actual kitchen queue", async ({ page }) => {
  test.skip(process.env.NF_S1_CATEGORY_SMOKE !== "1", "Only for seeded isolated QA");
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa.resto");
  await page.getByLabel("Password", { exact: true }).fill("owner123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  const outcome = await page.evaluate(async () => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const call = async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(path, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    };
    const tableCode = `QA${Date.now().toString(36).toUpperCase()}`;
    const table = await call("/api/restaurant/tables", "POST", {
      code: tableCode, name: "QA Sprint 1", capacity: 2, active: true, sortOrder: 999,
    });
    if (table.status !== 200) return { step: "table", ...table };
    const products = await call("/api/products");
    if (products.status !== 200 || !products.body?.length) return { step: "products", ...products };
    const opened = await call("/api/restaurant/orders", "POST", { tableId: table.body.id });
    if (opened.status !== 200) return { step: "open", ...opened };
    const orderId: string = opened.body.id;
    try {
      const added = await call(`/api/restaurant/orders/${orderId}/items`, "POST", {
        productId: products.body[0].id, qty: 1, note: "QA queue verification",
      });
      if (added.status !== 200) return { step: "add", ...added };
      const sent = await call(`/api/restaurant/orders/${orderId}/send-to-kitchen`, "POST");
      if (sent.status !== 200) return { step: "send", ...sent };
      const queue = await call("/api/restaurant/kitchen");
      return {
        step: "queue", status: queue.status,
        visible: queue.body?.some((order: { orderId: string; items: { kitchenStatus: string }[] }) =>
          order.orderId === orderId && order.items.some((item) => item.kitchenStatus === "queued")),
      };
    } finally {
      await call(`/api/restaurant/orders/${orderId}/cancel`, "POST", {
        reason: "Automated isolated QA cleanup",
      });
    }
  });
  expect(outcome).toEqual({ step: "queue", status: 200, visible: true });
});
