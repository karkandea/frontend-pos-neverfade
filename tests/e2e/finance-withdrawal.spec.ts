import {
  expect,
  test,
  type Page,
  type Route,
} from "@playwright/test";

import { mockTenantContext } from "./tenantContextFixture";

const owner = {
  id: "11111111-1111-1111-1111-111111111111",
  nama: "Owner Finance",
  username: "owner.finance",
  role: "owner",
};

const platformUser = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  nama: "Platform Admin",
  username: "platform.admin",
  role: "superadmin",
};

const verifiedBank = {
  bankName: "BCA",
  maskedAccountNumber: "•••• 7890",
  accountHolderName: "Owner Finance",
  verificationStatus: "verified",
  verificationNote: "Verified",
  updatedAt: "2026-09-07T01:00:00Z",
  verifiedAt: "2026-09-07T01:00:00Z",
};

const settings = {
  minimumAmount: 100000,
  processingEstimate: "Maksimal 1 hari kerja",
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function tenantSession(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("nfpos_token", "tenant-owner-token")
  );
}

function withdrawal(
  id: string,
  amount: number,
  status: "requested" | "processing" | "paid" | "rejected" | "cancelled",
  tenantName?: string
) {
  return {
    id,
    amount,
    status,
    destinationBankName: "BCA",
    destinationAccountMask: "•••• 7890",
    destinationAccountHolderName: "Owner Finance",
    transferReference: null,
    rejectionReason: null,
    requestedAt: "2026-09-07T02:00:00Z",
    processingStartedAt: status === "processing"
      ? "2026-09-07T02:10:00Z"
      : null,
    processedAt: status === "paid" || status === "rejected"
      ? "2026-09-07T03:00:00Z"
      : null,
    cancelledAt: status === "cancelled"
      ? "2026-09-07T03:00:00Z"
      : null,
    ...(tenantName
      ? {
          tenantId: `tenant-${id.slice(0, 4)}`,
          tenantName,
          requestedByUserId: `owner-${id.slice(0, 4)}`,
          requestedByName: `Owner ${tenantName}`,
          requestedByUsername: `owner.${tenantName.toLowerCase().replaceAll(" ", ".")}`,
          destinationAccountNumber: "1234567890",
          evidenceMetadata: null,
        }
      : {}),
  };
}

test(
  "owner uses verified payout account, requests withdrawal, and can cancel while waiting",
  async ({ page }) => {
    await tenantSession(page);

    let summary = {
      availableBalance: 750000,
      totalSuccessfulNonCashIncome: 1000000,
      totalWithdrawn: 150000,
      pendingWithdrawalAmount: 100000,
    };

    const withdrawals = [
      withdrawal(
        "22222222-2222-2222-2222-222222222222",
        100000,
        "requested"
      ),
    ];

    const movements = [
      {
        id: "movement-credit",
        type: "qris_credit",
        status: "paid",
        amount: 1000000,
        timestamp: "2026-09-07T01:00:00Z",
        reference: "py-xendit-qa",
        paymentId: "payment-qa",
        transactionId: "transaction-qa",
        withdrawalId: null,
      },
    ];

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (path === "/api/auth/me") {
        return json(route, owner);
      }

      if (path === "/api/finance/summary") {
        return json(route, summary);
      }

      if (
        path === "/api/finance/withdrawals" &&
        request.method() === "GET"
      ) {
        return json(route, withdrawals);
      }

      if (path === "/api/finance/movements") {
        return json(route, movements);
      }

      if (path === "/api/finance/withdrawal-settings") {
        return json(route, settings);
      }

      if (
        path === "/api/finance/bank-account" &&
        request.method() === "GET"
      ) {
        return json(route, verifiedBank);
      }

      if (
        path === "/api/finance/withdrawals" &&
        request.method() === "POST"
      ) {
        const payload = request.postDataJSON() as { amount: number };
        const created = {
          ...withdrawal(
            "33333333-3333-3333-3333-333333333333",
            payload.amount,
            "requested"
          ),
          requestedAt: "2026-09-07T04:00:00Z",
        };

        withdrawals.unshift(created);
        summary = {
          ...summary,
          availableBalance:
            summary.availableBalance - payload.amount,
          pendingWithdrawalAmount:
            summary.pendingWithdrawalAmount + payload.amount,
        };

        return json(route, created);
      }

      const cancel = path.match(
        /^\/api\/finance\/withdrawals\/([^/]+)\/cancel$/
      );

      if (cancel && request.method() === "POST") {
        const item = withdrawals.find(
          (entry) => entry.id === cancel[1]
        )!;

        item.status = "cancelled";
        item.cancelledAt = "2026-09-07T04:10:00Z";
        summary = {
          ...summary,
          availableBalance:
            summary.availableBalance + item.amount,
          pendingWithdrawalAmount:
            summary.pendingWithdrawalAmount - item.amount,
        };

        return json(route, item);
      }

      return json(route, {});
    });

    await mockTenantContext(page);

    await page.goto("/keuangan");

    await expect(
      page.getByRole("heading", { name: "Keuangan" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Rekening Payout" })
    ).toBeVisible();

    await expect(page.getByText("Terverifikasi")).toBeVisible();
    await expect(page.getByText("•••• 7890").first()).toBeVisible();

    await page.getByLabel("Jumlah pencairan").fill("250000");

    page.once("dialog", async (dialog) => {
      expect(dialog.message().replace(/\s/g, "")).toContain("Rp250.000");
      expect(dialog.message()).toContain("•••• 7890");
      await dialog.accept();
    });

    await page
      .getByRole("button", { name: "Ajukan Pencairan" })
      .click();

    await expect(
      page.getByText("Permintaan pencairan berhasil dikirim.")
    ).toBeVisible();

    await expect(
      page.getByText(/Rp\s*500\.000/).first()
    ).toBeVisible();

    const createdRow = page
      .getByRole("row")
      .filter({ hasText: "Rp 250.000" });

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Batalkan pencairan");
      await dialog.accept();
    });

    await createdRow
      .getByRole("button", { name: "Batalkan" })
      .click();

    await expect(
      page.getByText("Permintaan pencairan dibatalkan.")
    ).toBeVisible();

    await expect(
      createdRow.getByText("Dibatalkan")
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Mutasi Saldo" })
    ).toBeVisible();

    await expect(page.getByText("py-xendit-qa")).toBeVisible();
  }
);

test(
  "owner sees authoritative insufficient balance error returned by backend",
  async ({ page }) => {
    await tenantSession(page);

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (path === "/api/auth/me") {
        return json(route, owner);
      }

      if (path === "/api/finance/summary") {
        return json(route, {
          availableBalance: 500000,
          totalSuccessfulNonCashIncome: 500000,
          totalWithdrawn: 0,
          pendingWithdrawalAmount: 0,
        });
      }

      if (
        path === "/api/finance/withdrawals" &&
        request.method() === "GET"
      ) {
        return json(route, []);
      }

      if (path === "/api/finance/movements") {
        return json(route, []);
      }

      if (path === "/api/finance/withdrawal-settings") {
        return json(route, settings);
      }

      if (path === "/api/finance/bank-account") {
        return json(route, verifiedBank);
      }

      if (
        path === "/api/finance/withdrawals" &&
        request.method() === "POST"
      ) {
        return json(
          route,
          {
            code: "WITHDRAWAL_INSUFFICIENT_BALANCE",
            message:
              "Saldo tersedia tidak mencukupi untuk pencairan ini.",
          },
          409
        );
      }

      return json(route, {});
    });

    await mockTenantContext(page);

    await page.goto("/keuangan");
    await page.getByLabel("Jumlah pencairan").fill("200000");

    page.once("dialog", (dialog) => dialog.accept());

    await page
      .getByRole("button", { name: "Ajukan Pencairan" })
      .click();

    await expect(page.getByRole("alert")).toContainText(
      "Saldo tersedia tidak mencukupi"
    );

    await expect(
      page.getByText("Belum ada pencairan")
    ).toBeVisible();
  }
);

test(
  "owner can correct rejected payout account and verification resets to pending",
  async ({ page }) => {
    await tenantSession(page);

    let bank = {
      ...verifiedBank,
      verificationStatus: "rejected",
      verificationNote: "Nama rekening tidak sesuai.",
      verifiedAt: null,
    };

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (path === "/api/auth/me") {
        return json(route, owner);
      }

      if (path === "/api/finance/summary") {
        return json(route, {
          availableBalance: 500000,
          totalSuccessfulNonCashIncome: 500000,
          totalWithdrawn: 0,
          pendingWithdrawalAmount: 0,
        });
      }

      if (
        path === "/api/finance/withdrawals" &&
        request.method() === "GET"
      ) {
        return json(route, []);
      }

      if (path === "/api/finance/movements") {
        return json(route, []);
      }

      if (path === "/api/finance/withdrawal-settings") {
        return json(route, settings);
      }

      if (
        path === "/api/finance/bank-account" &&
        request.method() === "GET"
      ) {
        return json(route, bank);
      }

      if (
        path === "/api/finance/bank-account" &&
        request.method() === "PUT"
      ) {
        const payload = request.postDataJSON() as {
          bankName: string;
          accountNumber: string;
          accountHolderName: string;
        };

        bank = {
          bankName: payload.bankName,
          maskedAccountNumber: "•••• 6655",
          accountHolderName: payload.accountHolderName,
          verificationStatus: "pending",
          verificationNote: null,
          updatedAt: "2026-09-07T05:00:00Z",
          verifiedAt: null,
        };

        return json(route, bank);
      }

      return json(route, {});
    });

    await mockTenantContext(page);

    await page.goto("/keuangan");

    await expect(page.getByRole("alert")).toContainText(
      "Nama rekening tidak sesuai"
    );

    await expect(
      page.getByRole("button", {
        name: "Rekening Belum Terverifikasi",
      })
    ).toBeDisabled();

    await page
      .getByRole("button", { name: "Ubah Rekening" })
      .click();

    await page.getByLabel("Nama bank").fill("Mandiri");
    await page
      .getByLabel("Nomor rekening")
      .fill("9988776655");
    await page
      .getByLabel("Nama pemilik rekening")
      .fill("Owner Finance");

    await page
      .getByRole("button", { name: "Simpan Rekening" })
      .click();

    await expect(
      page.getByText(
        "Rekening payout tersimpan dan menunggu verifikasi Super Admin."
      )
    ).toBeVisible();

    await expect(
      page.getByText("Menunggu verifikasi")
    ).toBeVisible();

    await expect(
      page.getByText("•••• 6655")
    ).toBeVisible();
  }
);

test(
  "super admin verifies bank, processes one payout, and rejects another with reason",
  async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "nfpos_platform_token",
        "platform-token"
      )
    );

    const bankAccounts = [
      {
        tenantId: "tenant-kopi",
        tenantName: "Kopi Tenant",
        bankName: "BCA",
        accountNumber: "1234567890",
        maskedAccountNumber: "•••• 7890",
        accountHolderName: "Owner Kopi",
        verificationStatus: "pending",
        verificationNote: null,
        updatedAt: "2026-09-07T01:00:00Z",
        verifiedAt: null,
      },
    ];

    const withdrawals = [
      withdrawal(
        "44444444-4444-4444-4444-444444444444",
        300000,
        "requested",
        "Kopi Tenant"
      ),
      withdrawal(
        "55555555-5555-5555-5555-555555555555",
        200000,
        "requested",
        "Bakso Tenant"
      ),
    ];

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (path === "/api/platform/auth/me") {
        return json(route, platformUser);
      }

      if (
        path === "/api/platform/withdrawals" &&
        request.method() === "GET"
      ) {
        return json(route, withdrawals);
      }

      if (
        path === "/api/platform/withdrawals/bank-accounts" &&
        request.method() === "GET"
      ) {
        return json(route, bankAccounts);
      }

      const bankReview = path.match(
        /^\/api\/platform\/withdrawals\/bank-accounts\/([^/]+)\/review$/
      );

      if (bankReview && request.method() === "POST") {
        const payload = request.postDataJSON() as {
          verified: boolean;
          reason?: string;
        };

        const bank = bankAccounts.find(
          (entry) => entry.tenantId === bankReview[1]
        )!;

        Object.assign(bank, {
          verificationStatus: payload.verified
            ? "verified"
            : "rejected",
          verificationNote: payload.reason ?? null,
          verifiedAt: payload.verified
            ? "2026-09-07T02:00:00Z"
            : null,
        });

        return json(route, bank);
      }

      const action = path.match(
        /^\/api\/platform\/withdrawals\/([^/]+)\/(start-processing|mark-paid|reject)$/
      );

      if (action && request.method() === "POST") {
        const item = withdrawals.find(
          (entry) => entry.id === action[1]
        )!;

        if (action[2] === "start-processing") {
          Object.assign(item, {
            status: "processing",
            processingStartedAt: "2026-09-07T03:00:00Z",
          });

          return json(route, item);
        }

        if (action[2] === "mark-paid") {
          const payload = request.postDataJSON() as {
            confirmedTransferred: boolean;
            transferReference: string;
            evidenceMetadata?: string | null;
          };

          expect(payload.confirmedTransferred).toBe(true);

          Object.assign(item, {
            status: "paid",
            transferReference: payload.transferReference,
            evidenceMetadata: payload.evidenceMetadata ?? null,
            processedAt: "2026-09-07T04:00:00Z",
          });

          return json(route, item);
        }

        const payload = request.postDataJSON() as {
          reason: string;
        };

        Object.assign(item, {
          status: "rejected",
          rejectionReason: payload.reason,
          processedAt: "2026-09-07T04:00:00Z",
        });

        return json(route, item);
      }

      return json(route, {});
    });

    await page.goto("/platform/withdrawals");

    await expect(
      page.getByRole("heading", { name: "Pencairan" })
    ).toBeVisible();

    const bankRow = page
      .getByRole("row")
      .filter({ hasText: "Kopi Tenant" })
      .filter({ hasText: "1234567890" });

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("1234567890");
      await dialog.accept();
    });

    await bankRow
      .getByRole("button", { name: "Verifikasi" })
      .click();

    await expect(
      bankRow.getByText("Terverifikasi")
    ).toBeVisible();

    const kopiRow = page
      .getByRole("row")
      .filter({ hasText: "Rp 300.000" });

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Kopi Tenant");
      await dialog.accept();
    });

    await kopiRow
      .getByRole("button", { name: "Mulai Proses" })
      .click();

    await expect(
      kopiRow.getByText("Diproses")
    ).toBeVisible();

    await kopiRow
      .getByRole("button", { name: "Selesaikan Transfer" })
      .click();

    await page
      .getByLabel("Referensi transfer")
      .fill("BCA-TRF-001");

    await page
      .getByLabel("Catatan / bukti transfer (opsional)")
      .fill("rekonsiliasi-manual");

    await page
      .getByRole("button", {
        name: "Konfirmasi Sudah Transfer",
      })
      .click();

    await expect(
      kopiRow.getByText("Dibayar")
    ).toBeVisible();

    await expect(
      kopiRow.getByText("BCA-TRF-001")
    ).toBeVisible();

    const baksoRow = page
      .getByRole("row")
      .filter({ hasText: "Rp 200.000" });

    await baksoRow
      .getByRole("button", { name: "Tolak" })
      .click();

    await page
      .getByLabel("Alasan")
      .fill("Rekening tujuan perlu diperbaiki.");

    await page
      .getByRole("button", {
        name: "Konfirmasi Penolakan",
      })
      .click();

    await expect(
      baksoRow.getByText("Ditolak")
    ).toBeVisible();

    await expect(
      baksoRow.getByText("Rekening tujuan perlu diperbaiki.")
    ).toBeVisible();
  }
);
