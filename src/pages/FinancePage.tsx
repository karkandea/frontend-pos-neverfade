import { type FormEvent, useCallback, useEffect, useState } from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import type {
  FinanceMovement,
  FinanceSummary,
  Withdrawal,
  WithdrawalBankAccount,
  WithdrawalSettings,
  WithdrawalStatus,
} from "../types/finance";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const statusLabel: Record<WithdrawalStatus, string> = {
  requested: "Menunggu",
  processing: "Diproses",
  paid: "Dibayar",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const movementStatusLabel: Record<WithdrawalStatus | "paid", string> = {
  requested: "Dana ditahan",
  processing: "Sedang diproses",
  paid: "Selesai",
  rejected: "Ditolak · Dana dilepas",
  cancelled: "Dibatalkan · Dana dilepas",
};

const bankStatusLabel = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [bankAccount, setBankAccount] =
    useState<WithdrawalBankAccount | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState("");

  const loadFinance = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const [
        summaryResponse,
        withdrawalsResponse,
        movementsResponse,
        settingsResponse,
        bankResponse,
      ] = await Promise.all([
        api.get<FinanceSummary>("/api/finance/summary", { signal }),
        api.get<Withdrawal[]>("/api/finance/withdrawals", { signal }),
        api.get<FinanceMovement[]>("/api/finance/movements", { signal }),
        api.get<WithdrawalSettings>("/api/finance/withdrawal-settings", {
          signal,
        }),
        api.get<WithdrawalBankAccount | null>(
          "/api/finance/bank-account",
          { signal }
        ),
      ]);

      setSummary(summaryResponse.data);
      setWithdrawals(withdrawalsResponse.data);
      setMovements(movementsResponse.data);
      setSettings(settingsResponse.data);
      setBankAccount(bankResponse.data);
    } catch (requestError: unknown) {
      if (!signal?.aborted) {
        setError(getApiError(requestError).message);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      api.get<FinanceSummary>("/api/finance/summary", {
        signal: controller.signal,
      }),
      api.get<Withdrawal[]>("/api/finance/withdrawals", {
        signal: controller.signal,
      }),
      api.get<FinanceMovement[]>("/api/finance/movements", {
        signal: controller.signal,
      }),
      api.get<WithdrawalSettings>("/api/finance/withdrawal-settings", {
        signal: controller.signal,
      }),
      api.get<WithdrawalBankAccount | null>("/api/finance/bank-account", {
        signal: controller.signal,
      }),
    ])
      .then(
        ([
          summaryResponse,
          withdrawalsResponse,
          movementsResponse,
          settingsResponse,
          bankResponse,
        ]) => {
          setSummary(summaryResponse.data);
          setWithdrawals(withdrawalsResponse.data);
          setMovements(movementsResponse.data);
          setSettings(settingsResponse.data);
          setBankAccount(bankResponse.data);
        }
      )
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getApiError(requestError).message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  function openBankEditor() {
    setBankName(bankAccount?.bankName ?? "");
    setAccountNumber("");
    setAccountHolderName(bankAccount?.accountHolderName ?? "");
    setBankError("");
    setEditingBank(true);
  }

  async function saveBankAccount(event: FormEvent) {
    event.preventDefault();

    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      setBankError("Lengkapi nama bank, nomor rekening, dan nama pemilik.");
      return;
    }

    if (
      bankAccount?.verificationStatus === "verified" &&
      !window.confirm(
        "Mengubah rekening akan menghapus status verifikasi saat ini. Lanjutkan?"
      )
    ) {
      return;
    }

    setSavingBank(true);
    setBankError("");
    setSuccess("");

    try {
      const { data } = await api.put<WithdrawalBankAccount>(
        "/api/finance/bank-account",
        {
          bankName,
          accountNumber,
          accountHolderName,
        }
      );

      setBankAccount(data);
      setEditingBank(false);
      setAccountNumber("");
      setSuccess(
        "Rekening payout tersimpan dan menunggu verifikasi Super Admin."
      );
    } catch (requestError: unknown) {
      setBankError(getApiError(requestError).message);
    } finally {
      setSavingBank(false);
    }
  }

  async function submitWithdrawal(event: FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    const minimum = settings?.minimumAmount ?? 0;

    if (!bankAccount) {
      setSubmitError("Simpan rekening payout sebelum mengajukan pencairan.");
      return;
    }

    if (bankAccount.verificationStatus !== "verified") {
      setSubmitError("Rekening payout belum terverifikasi.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < minimum) {
      setSubmitError(
        `Minimum pencairan adalah ${currency.format(minimum)}.`
      );
      return;
    }

    if (!summary || parsedAmount > summary.availableBalance) {
      setSubmitError("Saldo tersedia tidak mencukupi untuk pencairan ini.");
      return;
    }

    const remaining = summary.availableBalance - parsedAmount;

    if (
      !window.confirm(
        `Ajukan pencairan ${currency.format(parsedAmount)}?\n\n` +
          `Tujuan: ${bankAccount.bankName} ${bankAccount.maskedAccountNumber} · ${bankAccount.accountHolderName}\n` +
          `Saldo tersedia setelah dana ditahan: ${currency.format(remaining)}.\n` +
          `Estimasi proses: ${settings?.processingEstimate ?? "manual"}.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSuccess("");

    try {
      await api.post<Withdrawal>("/api/finance/withdrawals", {
        amount: parsedAmount,
      });

      setAmount("");
      setSuccess("Permintaan pencairan berhasil dikirim.");
      await loadFinance();
    } catch (requestError: unknown) {
      const apiError = getApiError(requestError);

      const messageByCode: Record<string, string> = {
        WITHDRAWAL_INSUFFICIENT_BALANCE:
          "Saldo tersedia tidak mencukupi untuk pencairan ini.",
        WITHDRAWAL_BANK_ACCOUNT_REQUIRED:
          "Simpan rekening payout sebelum mengajukan pencairan.",
        WITHDRAWAL_BANK_ACCOUNT_NOT_VERIFIED:
          "Rekening payout belum terverifikasi.",
        WITHDRAWAL_BELOW_MINIMUM:
          `Minimum pencairan adalah ${currency.format(minimum)}.`,
      };

      setSubmitError(messageByCode[apiError.code] ?? apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelWithdrawal(item: Withdrawal) {
    if (
      !window.confirm(
        `Batalkan pencairan ${currency.format(item.amount)}? Dana yang ditahan akan kembali ke saldo tersedia.`
      )
    ) {
      return;
    }

    setSubmitError("");
    setSuccess("");

    try {
      await api.post(`/api/finance/withdrawals/${item.id}/cancel`);
      setSuccess("Permintaan pencairan dibatalkan.");
      await loadFinance();
    } catch (requestError: unknown) {
      setSubmitError(getApiError(requestError).message);
    }
  }

  const payoutReady =
    bankAccount?.verificationStatus === "verified";

  return (
    <AppShell>
      <div className="finance-page">
        <div className="content-header finance-heading">
          <div>
            <h1>Keuangan</h1>
            <p>Saldo non-tunai dan pencairan dana tenant.</p>
          </div>
        </div>

        {loading ? (
          <div className="finance-state" role="status">
            Memuat data keuangan...
          </div>
        ) : error ? (
          <div className="finance-state finance-error" role="alert">
            <strong>Data keuangan belum dapat dimuat</strong>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void loadFinance()}
            >
              Coba Lagi
            </button>
          </div>
        ) : summary ? (
          <>
            <section
              className="finance-summary-grid"
              aria-label="Ringkasan keuangan"
            >
              <article className="finance-summary-card finance-summary-primary">
                <span>Saldo Tersedia</span>
                <strong>{currency.format(summary.availableBalance)}</strong>
                <small>Dapat diajukan untuk pencairan</small>
              </article>

              <article className="finance-summary-card">
                <span>Pendapatan Non-tunai</span>
                <strong>
                  {currency.format(summary.totalSuccessfulNonCashIncome)}
                </strong>
                <small>Total pembayaran berhasil</small>
              </article>

              <article className="finance-summary-card">
                <span>Dana Ditahan</span>
                <strong>
                  {currency.format(summary.pendingWithdrawalAmount)}
                </strong>
                <small>Menunggu / sedang diproses</small>
              </article>

              <article className="finance-summary-card">
                <span>Total Dicairkan</span>
                <strong>{currency.format(summary.totalWithdrawn)}</strong>
                <small>Pencairan berstatus dibayar</small>
              </article>
            </section>

            <section className="finance-panel finance-bank-panel">
              <div className="finance-panel-heading finance-bank-heading">
                <div>
                  <h2>Rekening Payout</h2>
                  <p>
                    Rekening wajib terverifikasi sebelum dana dapat dicairkan.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openBankEditor}
                >
                  {bankAccount ? "Ubah Rekening" : "Tambah Rekening"}
                </button>
              </div>

              {bankAccount ? (
                <div className="finance-bank-summary">
                  <div>
                    <span>Bank</span>
                    <strong>{bankAccount.bankName}</strong>
                  </div>
                  <div>
                    <span>Nomor rekening</span>
                    <strong>{bankAccount.maskedAccountNumber}</strong>
                  </div>
                  <div>
                    <span>Pemilik</span>
                    <strong>{bankAccount.accountHolderName}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>
                      <span
                        className={`finance-status finance-status-bank-${bankAccount.verificationStatus}`}
                      >
                        {bankStatusLabel[bankAccount.verificationStatus]}
                      </span>
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="finance-empty finance-bank-empty">
                  <strong>Rekening payout belum tersedia</strong>
                  <p>
                    Tambahkan rekening bank untuk memulai proses verifikasi.
                  </p>
                </div>
              )}

              {bankAccount?.verificationStatus === "rejected" &&
              bankAccount.verificationNote ? (
                <div className="finance-inline-error" role="alert">
                  Alasan penolakan: {bankAccount.verificationNote}
                </div>
              ) : null}

              {editingBank ? (
                <form
                  className="finance-bank-form"
                  onSubmit={saveBankAccount}
                >
                  <div className="finance-bank-form-grid">
                    <label>
                      Nama bank
                      <input
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                        placeholder="Contoh: BCA"
                      />
                    </label>

                    <label>
                      Nomor rekening
                      <input
                        value={accountNumber}
                        onChange={(event) =>
                          setAccountNumber(event.target.value)
                        }
                        inputMode="numeric"
                        placeholder={
                          bankAccount
                            ? "Masukkan ulang nomor rekening"
                            : "Nomor rekening"
                        }
                      />
                    </label>

                    <label>
                      Nama pemilik rekening
                      <input
                        value={accountHolderName}
                        onChange={(event) =>
                          setAccountHolderName(event.target.value)
                        }
                        placeholder="Sesuai rekening bank"
                      />
                    </label>
                  </div>

                  {bankError ? (
                    <div className="finance-inline-error" role="alert">
                      {bankError}
                    </div>
                  ) : null}

                  <div className="finance-bank-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingBank(false)}
                      disabled={savingBank}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingBank}
                    >
                      {savingBank ? "Menyimpan..." : "Simpan Rekening"}
                    </button>
                  </div>
                </form>
              ) : null}
            </section>

            {success ? (
              <div className="finance-success" role="status">
                {success}
              </div>
            ) : null}

            {submitError ? (
              <div className="finance-inline-error" role="alert">
                {submitError}
              </div>
            ) : null}

            <div className="finance-grid">
              <section className="finance-panel">
                <div className="finance-panel-heading">
                  <div>
                    <h2>Riwayat Pencairan</h2>
                    <p>Status dan rekening tujuan setiap permintaan.</p>
                  </div>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="finance-empty">
                    <strong>Belum ada pencairan</strong>
                    <p>Permintaan yang dibuat akan muncul di sini.</p>
                  </div>
                ) : (
                  <div className="finance-table-wrap">
                    <table className="finance-table finance-withdrawal-history-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Jumlah</th>
                          <th>Tujuan</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((item) => (
                          <tr key={item.id}>
                            <td>{dateTime.format(new Date(item.requestedAt))}</td>
                            <td>
                              <strong>{currency.format(item.amount)}</strong>
                            </td>
                            <td>
                              <strong>{item.destinationBankName || "—"}</strong>
                              <small className="finance-table-sub">
                                {item.destinationAccountMask || "—"} ·{" "}
                                {item.destinationAccountHolderName || "—"}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`finance-status finance-status-${item.status}`}
                              >
                                {statusLabel[item.status]}
                              </span>
                              {item.rejectionReason ? (
                                <small className="finance-table-sub finance-table-reason">
                                  {item.rejectionReason}
                                </small>
                              ) : null}
                            </td>
                            <td>
                              {item.status === "requested" ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => void cancelWithdrawal(item)}
                                >
                                  Batalkan
                                </button>
                              ) : item.transferReference ? (
                                <code>{item.transferReference}</code>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="finance-panel finance-withdraw-card">
                <h2>Tarik Dana</h2>
                <p>
                  Minimum {currency.format(settings?.minimumAmount ?? 0)} ·{" "}
                  {settings?.processingEstimate ?? "Diproses manual"}
                </p>

                <form onSubmit={submitWithdrawal}>
                  <label htmlFor="withdrawal-amount">
                    Jumlah pencairan
                  </label>

                  <div className="finance-amount-input">
                    <span>Rp</span>
                    <input
                      id="withdrawal-amount"
                      type="number"
                      min={settings?.minimumAmount ?? 1}
                      step="1"
                      inputMode="numeric"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <small>
                    Saldo tersedia:{" "}
                    {currency.format(summary.availableBalance)}
                  </small>

                  <small>
                    Rekening:{" "}
                    {bankAccount
                      ? `${bankAccount.bankName} ${bankAccount.maskedAccountNumber}`
                      : "belum tersedia"}
                  </small>

                  <button
                    type="submit"
                    className="btn btn-primary finance-submit"
                    disabled={submitting || !payoutReady}
                  >
                    {submitting
                      ? "Mengirim..."
                      : payoutReady
                        ? "Ajukan Pencairan"
                        : "Rekening Belum Terverifikasi"}
                  </button>
                </form>
              </section>
            </div>

            <section className="finance-panel finance-movements">
              <div className="finance-panel-heading">
                <div>
                  <h2>Mutasi Saldo</h2>
                  <p>
                    Kredit QRIS dan lifecycle pencairan dari ledger NeverFade.
                  </p>
                </div>
              </div>

              {movements.length === 0 ? (
                <div className="finance-empty">
                  <strong>Belum ada mutasi</strong>
                  <p>Pembayaran QRIS dan pencairan akan muncul di sini.</p>
                </div>
              ) : (
                <div className="finance-table-wrap">
                  <table className="finance-table finance-movement-table">
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Jenis</th>
                        <th>Jumlah</th>
                        <th>Status</th>
                        <th>Referensi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={`${movement.type}-${movement.id}`}>
                          <td>
                            {dateTime.format(new Date(movement.timestamp))}
                          </td>
                          <td>
                            {movement.type === "qris_credit"
                              ? "Kredit QRIS"
                              : "Pencairan"}
                          </td>
                          <td>
                            <strong>
                              {movement.type === "qris_credit"
                                ? "+"
                                : movement.status === "paid"
                                  ? "−"
                                  : ""}
                              {currency.format(movement.amount)}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`finance-status finance-status-${movement.status}`}
                            >
                              {
                                movementStatusLabel[
                                  movement.status as WithdrawalStatus | "paid"
                                ]
                              }
                            </span>
                          </td>
                          <td>
                            <code>{movement.reference}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
