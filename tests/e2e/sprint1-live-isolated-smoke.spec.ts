import { expect, test } from "@playwright/test";

// Opt-in only: touches a running disposable Sprint-1 API, never a shared demo/prod URL.
test.skip(process.env.NF_S1_LIVE_SMOKE !== "1", "Requires isolated local QA database and API");

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
