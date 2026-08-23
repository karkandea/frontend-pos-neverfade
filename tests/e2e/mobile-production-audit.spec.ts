import { mkdir } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const PRODUCTION_URL = "https://neverfade-pos.vercel.app";
const product = {
  id: "baseline-mobile-product",
  kode: "MOBILE-BASELINE",
  barcode: "899000000088",
  nama: "Burger Baseline Mobile",
  kategori: "Makanan",
  hargaJual: 42000,
  stok: 20,
};

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
] as const;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function setupProductionReadOnly(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("nfpos_token", "production-mobile-audit-token");
  });

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/auth/me") {
      return json(route, {
        id: "audit-owner",
        nama: "Owner Audit",
        username: "owner.audit",
        role: "owner",
      });
    }
    if (path === "/api/products") return json(route, [product]);
    if (path === "/api/customers") return json(route, []);
    if (path === "/api/settings") {
      return json(route, {
        defaultTax: 0,
        headerStruk: "NeverFade Audit",
        footerStruk: "Audit only",
      });
    }
    if (path === "/api/payments/capabilities") {
      return json(route, {
        qrisEnabled: false,
        mode: "disabled",
        isSandbox: false,
      });
    }
    if (path === "/api/payments/current") {
      return route.fulfill({ status: 204, body: "" });
    }

    return json(route, []);
  });
}

test.describe("production mobile baseline", () => {
  test.skip(
    process.env.RUN_PRODUCTION_MOBILE_AUDIT !== "1",
    "Opt-in only; this reads the deployed production frontend with mocked APIs."
  );

  for (const viewport of viewports) {
    test(`baseline ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "Desktop Chromium", "Matrix runs once.");
      await page.setViewportSize(viewport);
      await setupProductionReadOnly(page);
      await page.goto(`${PRODUCTION_URL}/kasir`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Kasir", exact: true })).toBeVisible();

      const metrics = await page.evaluate(() => {
        const search = document.querySelector<HTMLInputElement>(".pos-search-bar input");
        const cart = document.querySelector<HTMLElement>(".pos-right");
        const left = document.querySelector<HTMLElement>(".pos-left");
        const grid = document.querySelector<HTMLElement>(".pos-products-grid");
        const checkout = document.querySelector<HTMLElement>(".cart-checkout-actions");
        const rect = (element: HTMLElement | null) => element
          ? { top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, height: element.getBoundingClientRect().height }
          : null;

        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          searchFocused: document.activeElement === search,
          cart: rect(cart),
          productArea: rect(left),
          grid: rect(grid),
          gridMaxHeight: grid ? getComputedStyle(grid).maxHeight : null,
          checkout: rect(checkout),
        };
      });

      console.log(`BASELINE_MOBILE_METRICS ${viewport.width}x${viewport.height} ${JSON.stringify(metrics)}`);
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);

      if (viewport.width === 390) {
        await mkdir("test-results/mobile-evidence", { recursive: true });
        await page.screenshot({
          path: "test-results/mobile-evidence/before-production-390x844-kasir.png",
          fullPage: false,
        });
      }
    });
  }
});
