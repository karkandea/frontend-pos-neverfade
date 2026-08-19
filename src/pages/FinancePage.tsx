import { type FormEvent, useCallback, useEffect, useState } from "react";

import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import { getApiError } from "../lib/apiError";
import type {
  FinanceMovement,
  FinanceSummary,
  Withdrawal,
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
const statusLabel = { requested: "Menunggu", paid: "Dibayar", rejected: "Ditolak" };
const movementStatusLabel = {
  requested: "Dana ditahan",
  paid: "Selesai",
  rejected: "Ditolak · Dana dilepas",
};

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFinance = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const [summaryResponse, withdrawalsResponse, movementsResponse] = await Promise.all([
        api.get<FinanceSummary>("/api/finance/summary", { signal }),
        api.get<Withdrawal[]>("/api/finance/withdrawals", { signal }),
        api.get<FinanceMovement[]>("/api/finance/movements", { signal }),
      ]);
      setSummary(summaryResponse.data);
      setWithdrawals(withdrawalsResponse.data);
      setMovements(movementsResponse.data);
    } catch (requestError: unknown) {
      if (!signal?.aborted) setError(getApiError(requestError).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
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
    ]).then(([summaryResponse, withdrawalsResponse, movementsResponse]) => {
      setSummary(summaryResponse.data);
      setWithdrawals(withdrawalsResponse.data);
      setMovements(movementsResponse.data);
    }).catch((requestError: unknown) => {
      if (!controller.signal.aborted) {
        setError(getApiError(requestError).message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  async function submitWithdrawal(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Masukkan jumlah pencairan yang valid.");
      return;
    }
    if (!summary || parsedAmount > summary.availableBalance) {
      setSubmitError("Saldo tersedia tidak mencukupi untuk pencairan ini.");
      return;
    }

    const remaining = summary.availableBalance - parsedAmount;
    if (!window.confirm(
      `Ajukan pencairan ${currency.format(parsedAmount)}?\n\n` +
      `Saldo tersedia setelah dana ditahan: ${currency.format(remaining)}.\n` +
      "Permintaan akan diproses manual oleh Super Admin."
    )) return;

    setSubmitting(true);
    setSubmitError("");
    setSuccess("");
    try {
      const { data } = await api.post<Withdrawal>("/api/finance/withdrawals", {
        amount: parsedAmount,
      });
      setWithdrawals((current) => [data, ...current]);
      setAmount("");
      setSuccess("Permintaan pencairan berhasil dikirim.");
      const { data: refreshedSummary } = await api.get<FinanceSummary>(
        "/api/finance/summary"
      );
      setSummary(refreshedSummary);
      const { data: refreshedMovements } = await api.get<FinanceMovement[]>(
        "/api/finance/movements"
      );
      setMovements(refreshedMovements);
    } catch (requestError: unknown) {
      const apiError = getApiError(requestError);
      setSubmitError(
        apiError.code === "WITHDRAWAL_INSUFFICIENT_BALANCE"
          ? "Saldo tersedia tidak mencukupi untuk pencairan ini."
          : apiError.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="finance-page">
        <div className="content-header finance-heading">
          <div><h1>Keuangan</h1><p>Saldo non-tunai dan pencairan dana tenant.</p></div>
        </div>

        {loading ? (
          <div className="finance-state" role="status">Memuat data keuangan...</div>
        ) : error ? (
          <div className="finance-state finance-error" role="alert">
            <strong>Data keuangan belum dapat dimuat</strong><p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => void loadFinance()}>Coba Lagi</button>
          </div>
        ) : summary ? (
          <>
            <section className="finance-summary-grid" aria-label="Ringkasan keuangan">
              <article className="finance-summary-card finance-summary-primary"><span>Saldo Tersedia</span><strong>{currency.format(summary.availableBalance)}</strong><small>Dapat diajukan untuk pencairan</small></article>
              <article className="finance-summary-card"><span>Pendapatan Non-tunai</span><strong>{currency.format(summary.totalSuccessfulNonCashIncome)}</strong><small>Total pembayaran berhasil</small></article>
              <article className="finance-summary-card"><span>Pencairan Pending</span><strong>{currency.format(summary.pendingWithdrawalAmount)}</strong><small>Menunggu diproses admin</small></article>
              <article className="finance-summary-card"><span>Total Dicairkan</span><strong>{currency.format(summary.totalWithdrawn)}</strong><small>Pencairan berstatus dibayar</small></article>
            </section>

            <div className="finance-grid">
              <section className="finance-panel">
                <div className="finance-panel-heading"><div><h2>Riwayat Pencairan</h2><p>Status permintaan pencairan tenant.</p></div></div>
                {withdrawals.length === 0 ? (
                  <div className="finance-empty"><strong>Belum ada pencairan</strong><p>Permintaan yang dibuat akan muncul di sini.</p></div>
                ) : (
                  <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Status</th><th>Diproses</th></tr></thead><tbody>{withdrawals.map((item) => <tr key={item.id}><td>{dateTime.format(new Date(item.requestedAt))}</td><td><strong>{currency.format(item.amount)}</strong></td><td><span className={`finance-status finance-status-${item.status}`}>{statusLabel[item.status]}</span></td><td>{item.processedAt ? dateTime.format(new Date(item.processedAt)) : "—"}</td></tr>)}</tbody></table></div>
                )}
              </section>

              <section className="finance-panel finance-withdraw-card">
                <h2>Tarik Dana</h2><p>Admin akan menghubungi tenant untuk detail transfer.</p>
                <form onSubmit={submitWithdrawal}>
                  <label htmlFor="withdrawal-amount">Jumlah pencairan</label>
                  <div className="finance-amount-input"><span>Rp</span><input id="withdrawal-amount" type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></div>
                  <small>Saldo tersedia: {currency.format(summary.availableBalance)}</small>
                  {submitError ? <div className="finance-inline-error" role="alert">{submitError}</div> : null}
                  {success ? <div className="finance-success" role="status">{success}</div> : null}
                  <button type="submit" className="btn btn-primary finance-submit" disabled={submitting}>{submitting ? "Mengirim..." : "Ajukan Pencairan"}</button>
                </form>
              </section>
            </div>

            <section className="finance-panel finance-movements">
              <div className="finance-panel-heading">
                <div>
                  <h2>Mutasi Saldo</h2>
                  <p>Kredit QRIS dan status pencairan dari ledger NeverFade.</p>
                </div>
              </div>
              {movements.length === 0 ? (
                <div className="finance-empty">
                  <strong>Belum ada mutasi</strong>
                  <p>Pembayaran QRIS dan pencairan akan muncul di sini.</p>
                </div>
              ) : (
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead><tr><th>Waktu</th><th>Jenis</th><th>Jumlah</th><th>Status</th><th>Referensi</th></tr></thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={`${movement.type}-${movement.id}`}>
                          <td>{dateTime.format(new Date(movement.timestamp))}</td>
                          <td>{movement.type === "qris_credit" ? "Kredit QRIS" : "Pencairan"}</td>
                          <td><strong>{movement.type === "qris_credit" ? "+" : movement.status === "paid" ? "−" : ""}{currency.format(movement.amount)}</strong></td>
                          <td><span className={`finance-status finance-status-${movement.status}`}>{movementStatusLabel[movement.status]}</span></td>
                          <td><code>{movement.reference}</code></td>
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
