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

test("isolated PostgreSQL enforces selected outlet and cashier assignment", async ({ page }) => {
  test.skip(process.env.NF_S1_MATRIX_SMOKE !== "1", "Only for isolated QA matrix");
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa.resto");
  await page.getByLabel("Password", { exact: true }).fill("owner123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  const setup = await page.evaluate(async () => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const call = async (path: string, method = "GET", body?: unknown, outletId?: string) => {
      const response = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(outletId ? { "X-Outlet-Id": outletId } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    };
    const outlets = await call("/api/outlets");
    let branch = outlets.body.find((o: { code: string }) => o.code === "S1-QA-BRANCH");
    if (!branch) {
      const created = await call("/api/outlets", "POST", {
        code: "S1-QA-BRANCH", name: "S1 QA Branch", address: "", phone: "", isDefault: false,
      });
      if (created.status !== 200) return { step: "branch", ...created };
      branch = created.body;
    }
    const main = outlets.body.find((o: { isDefault: boolean }) => o.isDefault);
    const mainTables = await call("/api/restaurant/tables");
    const branchTables = await call("/api/restaurant/tables", "GET", undefined, branch.id);
    if (!branchTables.body.some((t: { code: string }) => t.code === "A1")) {
      const created = await call("/api/restaurant/tables", "POST", {
        code: "A1", name: "Branch A1", capacity: 4, active: true, sortOrder: 1,
      }, branch.id);
      if (created.status !== 200) return { step: "branchTable", ...created };
    }
    const branchAfter = await call("/api/restaurant/tables", "GET", undefined, branch.id);
    const userList = await call("/api/users");
    if (userList.status !== 200) return { step: "users", ...userList };
    let cashier = userList.body.find((u: { username: string }) => u.username === "qa.resto.kasir");
    if (!cashier) {
      const created = await call("/api/users", "POST", {
        nama: "QA Restaurant Cashier", username: "qa.resto.kasir", password: "kasir123", role: "kasir",
      });
      if (created.status !== 200) return { step: "cashier", ...created };
      cashier = created.body;
    }
    const assign = await call(`/api/users/${cashier.id}/outlets`, "PUT", { outletIds: [main.id] });
    return {
      step: "ready", branchId: branch.id, mainCount: mainTables.body.length,
      branchCount: branchAfter.body.length,
      mainA1: mainTables.body.some((t: { code: string }) => t.code === "A1"),
      branchA1: branchAfter.body.some((t: { code: string }) => t.code === "A1"),
      assignmentStatus: assign.status,
    };
  });
  expect(setup.step).toBe("ready");
  if (setup.step !== "ready") return;
  expect(setup.assignmentStatus).toBe(200);
  expect(setup.mainA1).toBe(true);
  expect(setup.branchA1).toBe(true);
  expect(setup.mainCount).toBeGreaterThan(0);
  expect(setup.branchCount).toBeGreaterThan(0);

  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa.resto.kasir");
  await page.getByLabel("Password", { exact: true }).fill("kasir123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/kasir$/);
  const access = await page.evaluate(async (branchId) => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const headers = { Authorization: `Bearer ${token}` };
    const main = await fetch("/api/restaurant/tables", { headers });
    const branch = await fetch("/api/restaurant/tables", {
      headers: { ...headers, "X-Outlet-Id": branchId },
    });
    return { main: main.status, branch: branch.status };
  }, setup.branchId);
  expect(access).toEqual({ main: 200, branch: 403 });
});

test("isolated PostgreSQL denies outlet selection across tenants", async ({ page }) => {
  test.skip(process.env.NF_S1_MATRIX_SMOKE !== "1", "Only for isolated QA matrix");
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa.resto");
  await page.getByLabel("Password", { exact: true }).fill("owner123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  const restaurantBranchId = await page.evaluate(async () => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const response = await fetch("/api/outlets", { headers: { Authorization: `Bearer ${token}` } });
    const outlets = await response.json();
    return outlets.find((outlet: { code: string }) => outlet.code === "S1-QA-BRANCH")?.id as string | undefined;
  });
  expect(restaurantBranchId).toBeTruthy();

  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa.fashion");
  await page.getByLabel("Password", { exact: true }).fill("owner123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  const result = await page.evaluate(async (foreignOutletId) => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const headers = { Authorization: `Bearer ${token}` };
    const outletResponse = await fetch("/api/outlets", { headers });
    const outlets = await outletResponse.json();
    let branch = outlets.find((outlet: { code: string }) => outlet.code === "S1-FASHION-BRANCH");
    if (!branch) {
      const created = await fetch("/api/outlets", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ code: "S1-FASHION-BRANCH", name: "Fashion Branch", address: "", phone: "", isDefault: false }),
      });
      if (created.status !== 200) return { step: "create", status: created.status };
      branch = await created.json();
    }
    const own = await fetch("/api/transactions", { headers: { ...headers, "X-Outlet-Id": branch.id } });
    const foreign = await fetch("/api/transactions", { headers: { ...headers, "X-Outlet-Id": foreignOutletId } });
    return { step: "verify", own: own.status, foreign: foreign.status, distinct: branch.id !== foreignOutletId };
  }, restaurantBranchId!);
  expect(result).toEqual({ step: "verify", own: 200, foreign: 404, distinct: true });
});

test("isolated public QA kitchen operator is restricted to assigned tickets", async ({ page }) => {
  test.skip(process.env.NF_S1_KITCHEN_OPERATOR_SMOKE !== "1", "Requires dedicated kitchen QA fixture");
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa.resto.dapur");
  await page.getByLabel("Password", { exact: true }).fill("owner123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dapur$/);
  await expect(page.getByRole("heading", { name: "Dapur" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kasir", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Transaksi", exact: true })).toHaveCount(0);
  const access = await page.evaluate(async () => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const headers = { Authorization: `Bearer ${token}` };
    const queue = await fetch("/api/restaurant/kitchen/operator", { headers });
    const raw = await queue.text();
    const legacy = await fetch("/api/restaurant/kitchen", { headers });
    const products = await fetch("/api/products", { headers });
    const transactions = await fetch("/api/transactions", { headers });
    const users = await fetch("/api/users", { headers });
    return { queue: queue.status, safe: !/hargaJual|subtotal/i.test(raw),
      legacy: legacy.status, products: products.status,
      transactions: transactions.status, users: users.status };
  });
  expect(access).toEqual({ queue: 200, safe: true, legacy: 403,
    products: 403, transactions: 403, users: 403 });
  await page.goto("/kasir");
  await expect(page).toHaveURL(/\/dapur$/);
});
