import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.skip(process.env.NF_S1_PG_DEMO !== "1", "Explicit isolated PostgreSQL QA only");

test("demo provisioning seeds five types, live remains empty, and demo QRIS stays blocked", async ({ request }) => {
  const origin = process.env.NF_S1_PG_API_URL?.replace(/\/$/, "");
  const username = process.env.NF_S1_PLATFORM_QA_USERNAME;
  const password = process.env.NF_S1_PLATFORM_QA_PASSWORD;
  if (!origin || !username || !password) throw Error("Isolated QA credentials and API are required");
  const auth = await request.post(`${origin}/api/platform/auth/login`, { data: { username, password } });
  expect(auth.status()).toBe(200);
  const { token } = await auth.json();
  const variants = [
    ["general_retail", "DEMO-GR-"], ["fashion_retail", "DEMO-FA-"],
    ["food_beverage", "DEMO-FB-"], ["laundry", "DEMO-LD-"],
    ["salon_barbershop", "DEMO-SB-"],
  ] as const;
  for (const [businessType, codePrefix] of variants) {
    const identity = randomUUID();
    const ownerUsername = `qa.demo.${identity.slice(0, 16)}`;
    const ownerPassword = `QA-${identity}`;
    const response = await request.post(`${origin}/api/platform/tenants`, {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `s1-demo-${identity}` },
      data: {
        namaToko: `Demo ${businessType} ${identity.slice(0, 8)}`, businessType,
        mode: "demo", timeZoneId: "Asia/Makassar",
        owner: { nama: "QA Demo Owner", username: ownerUsername, password: ownerPassword },
      },
    });
    expect(response.status()).toBe(200);
    const tenant = await response.json();
    expect(tenant.mode).toBe("demo");
    expect(tenant.timeZoneId).toBe("Asia/Makassar");
    const login = await request.post(`${origin}/api/auth/login`, {
      data: { username: ownerUsername, password: ownerPassword },
    });
    expect(login.status()).toBe(200);
    const ownerToken = (await login.json()).token as string;
    const headers = { Authorization: `Bearer ${ownerToken}` };
    const productsResponse = await request.get(`${origin}/api/products`, { headers });
    expect(productsResponse.status()).toBe(200);
    const products = await productsResponse.json();
    expect(products).toHaveLength(2);
    expect(products.every((product: { kode: string }) => product.kode.startsWith(codePrefix))).toBe(true);
    if (businessType === "food_beverage") {
      const tables = await request.get(`${origin}/api/restaurant/tables`, { headers });
      expect(tables.status()).toBe(200);
      expect((await tables.json()).map((table: { code: string }) => table.code).sort()).toEqual(["A1", "A2"]);
    }
    const payment = await request.get(`${origin}/api/payments/capabilities`, { headers });
    expect(payment.status()).toBe(200);
    expect((await payment.json()).qrisEnabled).toBe(false);
  }
  const id = randomUUID();
  const liveUsername = `qa.live.${id.slice(0, 16)}`;
  const livePassword = `QA-${id}`;
  const liveResponse = await request.post(`${origin}/api/platform/tenants`, {
    headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `s1-live-${id}` },
    data: {
      namaToko: `Live QA ${id.slice(0, 8)}`, businessType: "food_beverage",
      owner: { nama: "QA Live Owner", username: liveUsername, password: livePassword },
    },
  });
  expect(liveResponse.status()).toBe(200);
  expect((await liveResponse.json()).mode).toBe("live");
  const liveLogin = await request.post(`${origin}/api/auth/login`, {
    data: { username: liveUsername, password: livePassword },
  });
  expect(liveLogin.status()).toBe(200);
  const liveToken = (await liveLogin.json()).token as string;
  const liveProducts = await request.get(`${origin}/api/products`, { headers: { Authorization: `Bearer ${liveToken}` } });
  expect(liveProducts.status()).toBe(200);
  expect(await liveProducts.json()).toEqual([]);
});
