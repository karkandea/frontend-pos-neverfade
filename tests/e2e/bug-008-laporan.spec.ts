import { expect, test, type Page } from "@playwright/test";

const API_URL = process.env.QA_API_URL ?? "http://localhost:5012";

const OWNER_USERNAME = process.env.QA_OWNER_USERNAME ?? "owner";

const OWNER_PASSWORD = process.env.QA_OWNER_PASSWORD ?? "owner123";

type Summary = {
  omzet: number;
  transaksi: number;
  avg: number;
  pelanggan: number;
};

type ChartItem = {
  date: string;
  label: string;
  total: number;
};

type TopProduct = {
  nama: string;
  qty: number;
  revenue: number;
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function authenticate(page: Page) {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: {
      username: OWNER_USERNAME,
      password: OWNER_PASSWORD,
    },
  });

  expect(response.status(), "Dummy owner login harus berhasil.").toBe(200);

  const body = await response.json();

  const token = body.token as string;

  expect(token).toBeTruthy();

  await page.addInitScript((authToken) => {
    window.localStorage.setItem("nfpos_token", authToken);
  }, token);

  return token;
}

async function getBackendReport(page: Page, token: string, period: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const [summaryResponse, chartResponse, topProductsResponse] =
    await Promise.all([
      page.request.get(`${API_URL}/api/laporan/summary?period=${period}`, {
        headers,
      }),
      page.request.get(`${API_URL}/api/laporan/chart`, {
        headers,
      }),
      page.request.get(`${API_URL}/api/laporan/top-products?period=${period}`, {
        headers,
      }),
    ]);

  expect(summaryResponse.status()).toBe(200);

  expect(chartResponse.status()).toBe(200);

  expect(topProductsResponse.status()).toBe(200);

  return {
    summary: (await summaryResponse.json()) as Summary,
    chart: (await chartResponse.json()) as ChartItem[],
    topProducts: (await topProductsResponse.json()) as TopProduct[],
  };
}

test("BUG-008 displays real summary, chart, and top products", async ({
  page,
}) => {
  const token = await authenticate(page);

  const backend = await getBackendReport(page, token, "harian");

  expect(
    backend.summary.omzet,
    "Fixture QA harus menghasilkan omzet harian.",
  ).toBeGreaterThan(0);

  expect(
    backend.summary.transaksi,
    "Fixture QA harus menghasilkan transaksi harian.",
  ).toBeGreaterThan(0);

  expect(backend.chart.length).toBe(7);

  const summaryResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/laporan/summary" &&
      url.searchParams.get("period") === "harian" &&
      response.request().method() === "GET"
    );
  });

  const chartResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/laporan/chart" &&
      response.request().method() === "GET"
    );
  });

  const topProductsResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/laporan/top-products" &&
      url.searchParams.get("period") === "harian" &&
      response.request().method() === "GET"
    );
  });

  await page.goto("/laporan");

  expect((await summaryResponse).status()).toBe(200);

  expect((await chartResponse).status()).toBe(200);

  expect((await topProductsResponse).status()).toBe(200);

  const summary = page.locator("#laporan-summary");

  await expect(summary).toContainText(rupiah(backend.summary.omzet));

  await expect(summary).toContainText(String(backend.summary.transaksi));

  await expect(summary).toContainText(rupiah(backend.summary.avg));

  await expect(summary).toContainText(String(backend.summary.pelanggan));

  const canvas = page.locator("#laporan-chart");

  await expect(canvas).toBeVisible();

  const canvasSize = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
  }));

  expect(canvasSize.width).toBeGreaterThan(0);

  expect(canvasSize.height).toBeGreaterThan(0);

  const topProducts = page.locator("#laporan-top-products");

  await expect(topProducts).toBeVisible();

  if (backend.topProducts.length > 0) {
    const first = backend.topProducts[0];

    await expect(topProducts).toContainText(first.nama);

    await expect(topProducts).toContainText(String(first.qty));

    await expect(topProducts).toContainText(rupiah(first.revenue));
  }
});

test("BUG-008 Generate reloads report using selected period", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "Desktop Chromium",
    "Period switching diverifikasi sekali pada desktop.",
  );

  const token = await authenticate(page);

  const weekly = await getBackendReport(page, token, "mingguan");

  await page.goto("/laporan");

  await expect(page.locator("#btn-generate-laporan")).toHaveText("Generate");

  await page.locator("#laporan-period").selectOption("mingguan");

  const summaryResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/laporan/summary" &&
      url.searchParams.get("period") === "mingguan"
    );
  });

  const topResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/laporan/top-products" &&
      url.searchParams.get("period") === "mingguan"
    );
  });

  await page.locator("#btn-generate-laporan").click();

  expect((await summaryResponse).status()).toBe(200);

  expect((await topResponse).status()).toBe(200);

  const summary = page.locator("#laporan-summary");

  await expect(summary).toContainText(rupiah(weekly.summary.omzet));

  await expect(summary).toContainText(String(weekly.summary.transaksi));

  if (weekly.topProducts.length > 0) {
    await expect(page.locator("#laporan-top-products")).toContainText(
      weekly.topProducts[0].nama,
    );
  }
});
