import { expect, test, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify(body) });
}

test("owner can revoke cashier session with idempotency key from user management", async ({ page }) => {
  const owner = { id: "owner-qa", nama: "Owner QA", username: "owner", role: "owner" };
  const cashier = { id: "cashier-qa", nama: "Kasir QA",
    username: "kasir", role: "kasir", active: true };
  let revokeKey: string | undefined;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login")
      return json(route, { token: "owner-ex02-token", user: owner });
    if (path === "/api/auth/me") return json(route, owner);
    if (path === "/api/outlets") return json(route, [
      { id: "outlet-qa", code: "MAIN", name: "Utama", isDefault: true, active: true },
    ]);
    if (path === "/api/products") return json(route, []);
    if (path === "/api/users" && route.request().method() === "GET")
      return json(route, [ { ...owner, active: true }, cashier ]);
    if (path === "/api/users/cashier-qa/revoke") {
      revokeKey = route.request().headers()["idempotency-key"];
      return json(route, { ok: true });
    }
    return json(route, []);
  });
  await mockTenantContext(page, "owner");
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/pengguna");
  const cashierRow = page.getByRole("row").filter({ hasText: "Kasir QA" });
  await expect(cashierRow.getByRole("button", { name: "Cabut sesi" })).toBeEnabled();
  page.on("dialog", (dialog) => dialog.accept());
  await cashierRow.getByRole("button", { name: "Cabut sesi" }).click();
  await expect.poll(() => revokeKey).toMatch(/^[0-9a-f-]{36}$/i);
  const ownerRow = page.getByRole("row").filter({ hasText: "Owner QA" });
  await expect(ownerRow.getByRole("button", { name: "Cabut sesi" })).toBeDisabled();
});
