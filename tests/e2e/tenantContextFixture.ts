import type { Page, Route } from "@playwright/test";
import type { TenantCapability } from "../../src/types/platform";

export const commonTenantCapabilities: TenantCapability[] = [
  "core_pos",
  "inventory",
  "customers",
  "reports",
  "attendance",
  "finance_withdrawal",
];

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockTenantContext(
  page: Page,
  role: "owner" | "admin" | "kasir" = "owner",
  capabilities: TenantCapability[] = commonTenantCapabilities
) {
  await page.route("**/api/tenant/context", (route) =>
    json(route, {
      tenantId: "99999999-9999-9999-9999-999999999999",
      namaToko: "NeverFade QA",
      businessType: "general_retail",
      capabilities,
      role,
    })
  );
}
