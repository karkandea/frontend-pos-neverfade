import { expect, test } from "@playwright/test";

test.skip(process.env.NF_S1_FINANCE_LIVE_SMOKE !== "1", "Read-only isolated QA finance baseline");

test("owner finance endpoints load without internal server error on isolated QA", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("owner123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  const statuses = await page.evaluate(async () => {
    const token = sessionStorage.getItem("nfpos_token") ?? localStorage.getItem("nfpos_token");
    const headers = { Authorization: `Bearer ${token}` };
    const paths = ["summary", "withdrawals", "movements", "withdrawal-settings", "bank-account"];
    return Promise.all(paths.map(async (path) => ({
      path, status: (await fetch(`/api/finance/${path}`, { headers })).status,
    })));
  });
  expect(statuses).toEqual([
    { path: "summary", status: 200 }, { path: "withdrawals", status: 200 },
    { path: "movements", status: 200 }, { path: "withdrawal-settings", status: 200 },
    { path: "bank-account", status: 204 },
  ]);
  await page.goto("/keuangan");
  await expect(page.getByText("Data keuangan belum dapat dimuat")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Keuangan" })).toBeVisible();
});
