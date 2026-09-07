import {
  expect,
  type Page,
} from "@playwright/test";

export const ownerUsername =
  process.env.QA_OWNER_USERNAME ??
  "owner";

export const ownerPassword =
  process.env.QA_OWNER_PASSWORD ??
  "";

export const e2eProductName =
  process.env.QA_E2E_PRODUCT_NAME ??
  "Lumpia Beef Original";

export const knownTransactionNumber =
  process.env.QA_KNOWN_TRANSACTION_NO ??
  "";

export async function loginAsOwner(
  page: Page
) {
  if (!ownerPassword) {
    throw new Error(
      "QA_OWNER_PASSWORD belum tersedia."
    );
  }

  await page.goto("/login");

  await expect(
    page.locator("#login-username")
  ).toBeVisible();

  await page
    .locator("#login-username")
    .fill(ownerUsername);

  await page
    .locator("#login-password")
    .fill(ownerPassword);

  const tenantContextResponse =
    page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/tenant/context" &&
        response.request().method() === "GET"
      );
    });

  const [, contextResponse] = await Promise.all([
    page.waitForURL("**/produk"),
    tenantContextResponse,
    page.locator("#btn-login").click(),
  ]);

  expect(
    contextResponse.status(),
    "Tenant context must load successfully after login."
  ).toBe(200);

  await expect(
    page.getByRole("heading", {
      name: "Produk",
      exact: true,
    })
  ).toBeVisible();
}
