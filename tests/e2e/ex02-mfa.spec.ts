import { expect, test, type Route } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

const identity = { id: "qa-owner", nama: "QA Owner", username: "owner", role: "owner" };
const reply = (route: Route, data: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

test("MFA login challenges password-only attempts and submits OTP", async ({ page }) => {
  const attempted: Array<Record<string, string>> = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/login") {
      const body = route.request().postDataJSON() as Record<string, string>;
      attempted.push(body);
      if (!body.totpCode && !body.recoveryCode)
        return reply(route, { code: "MFA_REQUIRED", message: "OTP wajib." }, 401);
      return reply(route, { token: "qa-mfa-token", user: identity });
    }
    if (path === "/api/auth/me") return reply(route, identity);
    if (path === "/api/outlets") return reply(route, []);
    if (path === "/api/products") return reply(route, []);
    return reply(route, []);
  });
  await mockTenantContext(page);
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByLabel("Kode autentikator (6 digit)")).toBeVisible();
  await page.getByLabel("Kode autentikator (6 digit)").fill("123456");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  expect(attempted).toHaveLength(2);
  expect(attempted[1]?.totpCode).toBe("123456");
  expect(attempted[1]?.password).toBe("password");
});
