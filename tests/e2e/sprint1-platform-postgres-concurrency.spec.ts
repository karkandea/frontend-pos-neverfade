import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.skip(process.env.NF_S1_PG_CONCURRENCY !== "1", "Opt-in isolated PostgreSQL QA only");

test("simultaneous provisioning retries create exactly one tenant", async ({ request }) => {
  const baseURL = process.env.NF_S1_PG_API_URL;
  const username = process.env.NF_S1_PLATFORM_QA_USERNAME;
  const password = process.env.NF_S1_PLATFORM_QA_PASSWORD;
  if (!baseURL || !username || !password) throw Error("Isolated QA API and platform credentials required");
  const origin = baseURL.replace(/\/$/, "");
  const auth = await request.post(`${origin}/api/platform/auth/login`, { data: { username, password } });
  expect(auth.status()).toBe(200);
  const { token } = await auth.json();
  const key = `s1-provision-${randomUUID()}`;
  const body = {
    namaToko: `S1 Concurrency ${key.slice(-8)}`,
    businessType: "food_beverage",
    owner: {
      nama: "QA Concurrent Owner",
      username: `qa.s1.concurrent.${randomUUID().slice(0, 12)}`,
      password: `QA-${randomUUID()}`,
    },
  };
  const headers = { Authorization: `Bearer ${token}`, "Idempotency-Key": key };
  const results = await Promise.all(Array.from({ length: 8 }, async () => {
    const response = await request.post(`${origin}/api/platform/tenants`, { data: body, headers, timeout: 35000 });
    return { status: response.status(), body: await response.json() };
  }));
  console.info("REAL_PG_CONCURRENT_HTTP", results.map((r) => r.status));
  const createdIds = new Set(results.filter((r) => r.status === 200).map((r) => r.body.id));
  expect(results.map((r) => r.status)).toEqual(Array(8).fill(200));
  expect(createdIds.size).toBe(1);
  const conflict = await request.post(`${origin}/api/platform/tenants`, {
    data: { ...body, namaToko: "Different payload" }, headers,
  });
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).code).toBe("IDEMPOTENCY_KEY_REUSED");
});
