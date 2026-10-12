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
      if (body.totpCode && body.totpCode !== "123456")
        return reply(route, { code: "MFA_INVALID", message: "Kode tidak sesuai." }, 401);
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
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Kode autentikator (6 digit)").fill("000000");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Kode tidak sesuai.")).toBeVisible();
  await expect(page.getByLabel("Kode autentikator (6 digit)")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("nfpos_token") ??
    sessionStorage.getItem("nfpos_token"))).toBeNull();
  await page.getByLabel("Kode autentikator (6 digit)").fill("123456");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  expect(attempted).toHaveLength(3);
  expect(attempted[1]?.totpCode).toBe("000000");
  expect(attempted[2]?.totpCode).toBe("123456");
  expect(attempted[2]?.password).toBe("password");
});

test("MFA setup proof failures keep settings open instead of logging out", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/auth/login")
      return reply(route, { token: "qa-mfa-settings-token", user: identity });
    if (path === "/api/auth/me") return reply(route, identity);
    if (path === "/api/auth/mfa/status")
      return reply(route, { enabled: false, pending: false, configured: true });
    if (path === "/api/auth/mfa/enroll") {
      const body = route.request().postDataJSON() as { password: string };
      if (body.password !== "correct")
        return reply(route, { code: "MFA_PASSWORD_INVALID", message: "Password salah." }, 401);
      return reply(route, {
        manualKey: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
        otpAuthUri: "otpauth://totp/Neverfade%20POS:owner?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Neverfade%20POS",
        expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
      });
    }
    if (path === "/api/auth/mfa/confirm")
      return reply(route, { code: "MFA_INVALID", message: "OTP salah." }, 401);
    if (path === "/api/settings")
      return reply(route, {
        namaToko: "QA", alamat: "", telepon: "", email: "", website: "",
        headerStruk: "", footerStruk: "", showTax: false, showPoint: false,
        defaultTax: 0, minStok: 5, poinRate: 1,
      });
    if (path === "/api/outlets") return reply(route, []);
    return reply(route, []);
  });
  await mockTenantContext(page, "owner");
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/pengaturan");
  await expect(page.getByText("Autentikator dua langkah")).toBeVisible();

  await page.getByLabel("Password saat ini").fill("bad");
  await page.getByRole("button", { name: "Mulai aktivasi" }).click();
  await expect(page.getByText("Gagal memulai aktivasi. Periksa password dan koneksi.")).toBeVisible();
  await expect(page).toHaveURL(/\/pengaturan$/);

  await page.getByLabel("Password saat ini").fill("correct");
  await page.getByRole("button", { name: "Mulai aktivasi" }).click();
  await expect(page.getByLabel("Kode verifikasi 6 digit")).toBeVisible();
  await page.getByLabel("Kode verifikasi 6 digit").fill("000000");
  await page.getByRole("button", { name: "Aktifkan autentikator" }).click();
  await expect(page.getByText("Kode belum sesuai atau kedaluwarsa. Coba kode terbaru.")).toBeVisible();
  await expect(page).toHaveURL(/\/pengaturan$/);
});
