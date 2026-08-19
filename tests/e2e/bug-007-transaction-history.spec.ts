import { expect, test, type Page } from "@playwright/test";

const API_URL = process.env.QA_API_URL ?? "http://localhost:5012";

const OWNER_USERNAME = process.env.QA_OWNER_USERNAME ?? "owner";

const OWNER_PASSWORD = process.env.QA_OWNER_PASSWORD ?? "owner123";

type Transaction = {
  id: string;
  noTrx: string;
  tanggal: string;
  kasir: string;
  customerNama: string;
  total: number;
  metodePembayaran: string;
  items: Array<{
    id: string;
    nama: string;
    hargaJual: number;
    qty: number;
    subtotal: number;
  }>;
};

async function loginAndGetTransactions(page: Page) {
  const loginResponse = await page.request.post(`${API_URL}/api/auth/login`, {
    data: {
      username: OWNER_USERNAME,
      password: OWNER_PASSWORD,
    },
  });

  expect(loginResponse.status(), "Dummy owner login harus berhasil.").toBe(200);

  const loginBody = await loginResponse.json();

  const token = loginBody.token as string;

  expect(token).toBeTruthy();

  await page.addInitScript((authToken) => {
    window.localStorage.setItem("nfpos_token", authToken);
  }, token);

  const transactionsResponse = await page.request.get(
    `${API_URL}/api/transactions`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  expect(transactionsResponse.status(), "Transaction API harus tersedia.").toBe(
    200,
  );

  const transactions = (await transactionsResponse.json()) as Transaction[];

  expect(
    transactions.length,
    "Dev QA database harus punya minimal satu transaksi.",
  ).toBeGreaterThan(0);

  return {
    token,
    transactions,
  };
}

test("BUG-007 loads, searches, and shows transaction detail", async ({
  page,
}) => {
  const { transactions } = await loginAndGetTransactions(page);

  const target = transactions[0];

  const initialResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/transactions" &&
      response.request().method() === "GET" &&
      !url.searchParams.has("search")
    );
  });

  await page.goto("/transaksi");

  expect((await initialResponse).status()).toBe(200);

  const table = page.locator("#transaksi-tbody");

  await expect(table).toContainText(target.noTrx);

  await expect(table).toContainText(target.kasir);

  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === "/api/transactions" &&
      url.searchParams.get("search") === target.noTrx &&
      response.request().method() === "GET"
    );
  });

  await page.locator("#transaksi-search").fill(target.noTrx);

  expect((await searchResponse).status()).toBe(200);

  await expect(table).toContainText(target.noTrx);

  const row = table.locator("tr").filter({
    hasText: target.noTrx,
  });

  await expect(row).toHaveCount(1);

  await row
    .getByRole("button", {
      name: "Detail",
    })
    .click();

  const modal = page.locator(".modal-overlay.open");

  await expect(modal).toBeVisible();

  await expect(modal).toContainText(target.noTrx);

  await expect(modal).toContainText(target.kasir);

  await expect(modal).toContainText(target.customerNama || "Umum");

  await expect(modal).toContainText(target.metodePembayaran);

  if (target.items.length > 0) {
    await expect(modal).toContainText(target.items[0].nama);
  }

  await modal
    .getByRole("button", {
      name: "Tutup",
      exact: true,
    })
    .click();

  await expect(modal).not.toBeVisible();
});

test("BUG-007 exports transaction history as CSV", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "Desktop Chromium",
    "CSV download diverifikasi sekali pada desktop.",
  );

  await loginAndGetTransactions(page);

  await page.goto("/transaksi");

  await expect(page.locator("#transaksi-tbody tr").first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");

  await page.locator("#btn-export-transaksi").click();

  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^transaksi-\d{4}-\d{2}-\d{2}\.csv$/,
  );

  const stream = await download.createReadStream();

  expect(stream).not.toBeNull();

  let content = "";

  if (stream) {
    for await (const chunk of stream) {
      content += chunk.toString();
    }
  }

  expect(content).toContain("No Transaksi");

  expect(content).toContain("Metode Pembayaran");

  expect(content).toContain("Status");

  expect(content).toContain("Selesai");
});
