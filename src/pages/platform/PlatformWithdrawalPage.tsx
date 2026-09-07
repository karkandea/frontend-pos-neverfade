import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import PlatformShell from "../../components/platform/PlatformShell";
import { getApiError } from "../../lib/apiError";
import platformApi from "../../lib/platformApi";
import type {
  PlatformWithdrawal,
  PlatformWithdrawalBankAccount,
  WithdrawalStatus,
} from "../../types/finance";

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

const bankStatusLabel = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

type ActionPanel =
  | {
      kind: "bank-reject";
      bank: PlatformWithdrawalBankAccount;
    }
  | {
      kind: "withdrawal-paid";
      withdrawal: PlatformWithdrawal;
    }
  | {
      kind: "withdrawal-reject";
      withdrawal: PlatformWithdrawal;
    }
  | null;

export default function PlatformWithdrawalPage() {
  const [withdrawals, setWithdrawals] =
    useState<PlatformWithdrawal[]>([]);
  const [bankAccounts, setBankAccounts] =
    useState<PlatformWithdrawalBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [actionPanel, setActionPanel] =
    useState<ActionPanel>(null);
  const [actionNote, setActionNote] = useState("");
  const [transferReference, setTransferReference] = useState("");

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const [withdrawalResponse, bankResponse] = await Promise.all([
        platformApi.get<PlatformWithdrawal[]>(
          "/api/platform/withdrawals",
          { signal }
        ),
        platformApi.get<PlatformWithdrawalBankAccount[]>(
          "/api/platform/withdrawals/bank-accounts",
          { signal }
        ),
      ]);

      setWithdrawals(withdrawalResponse.data);
      setBankAccounts(bankResponse.data);
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
      platformApi.get<PlatformWithdrawal[]>(
        "/api/platform/withdrawals",
        { signal: controller.signal }
      ),
      platformApi.get<PlatformWithdrawalBankAccount[]>(
        "/api/platform/withdrawals/bank-accounts",
        { signal: controller.signal }
      ),
    ])
      .then(([withdrawalResponse, bankResponse]) => {
        setWithdrawals(withdrawalResponse.data);
        setBankAccounts(bankResponse.data);
      })
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

  function resetActionPanel() {
    setActionPanel(null);
    setActionNote("");
    setTransferReference("");
  }

  async function verifyBank(item: PlatformWithdrawalBankAccount) {
    if (
      !window.confirm(
        `Verifikasi rekening payout ${item.tenantName}?\n\n` +
          `${item.bankName} · ${item.accountNumber}\n` +
          `${item.accountHolderName}`
      )
    ) {
      return;
    }

    setActionId(`bank-${item.tenantId}`);
    setActionError("");
    setSuccess("");

    try {
      const { data } =
        await platformApi.post<PlatformWithdrawalBankAccount>(
          `/api/platform/withdrawals/bank-accounts/${item.tenantId}/review`,
          {
            verified: true,
            reason: "Diverifikasi oleh Super Admin.",
          }
        );

      setBankAccounts((current) =>
        current.map((entry) =>
          entry.tenantId === data.tenantId ? data : entry
        )
      );

      setSuccess(
        `Rekening payout ${data.tenantName} berhasil diverifikasi.`
      );
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionId("");
    }
  }

  async function startProcessing(item: PlatformWithdrawal) {
    if (
      !window.confirm(
        `Mulai proses pencairan ${item.tenantName}?\n\n` +
          `Jumlah: ${currency.format(item.amount)}\n` +
          `Tujuan: ${item.destinationBankName} · ${item.destinationAccountNumber}`
      )
    ) {
      return;
    }

    setActionId(item.id);
    setActionError("");
    setSuccess("");

    try {
      const { data } = await platformApi.post<PlatformWithdrawal>(
        `/api/platform/withdrawals/${item.id}/start-processing`
      );

      setWithdrawals((current) =>
        current.map((entry) =>
          entry.id === data.id ? data : entry
        )
      );

      setSuccess(
        "Pencairan masuk status diproses. Selesaikan transfer lalu catat referensinya."
      );
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionId("");
    }
  }

  async function submitAction(event: FormEvent) {
    event.preventDefault();

    if (!actionPanel) {
      return;
    }

    setActionError("");
    setSuccess("");

    try {
      if (actionPanel.kind === "bank-reject") {
        if (actionNote.trim().length < 3) {
          setActionError("Alasan penolakan rekening wajib diisi.");
          return;
        }

        const item = actionPanel.bank;
        setActionId(`bank-${item.tenantId}`);

        const { data } =
          await platformApi.post<PlatformWithdrawalBankAccount>(
            `/api/platform/withdrawals/bank-accounts/${item.tenantId}/review`,
            {
              verified: false,
              reason: actionNote.trim(),
            }
          );

        setBankAccounts((current) =>
          current.map((entry) =>
            entry.tenantId === data.tenantId ? data : entry
          )
        );

        setSuccess(
          `Rekening payout ${data.tenantName} ditolak dan tenant dapat memperbaikinya.`
        );
      } else if (actionPanel.kind === "withdrawal-reject") {
        if (actionNote.trim().length < 3) {
          setActionError("Alasan penolakan pencairan wajib diisi.");
          return;
        }

        const item = actionPanel.withdrawal;
        setActionId(item.id);

        const { data } = await platformApi.post<PlatformWithdrawal>(
          `/api/platform/withdrawals/${item.id}/reject`,
          {
            reason: actionNote.trim(),
          }
        );

        setWithdrawals((current) =>
          current.map((entry) =>
            entry.id === data.id ? data : entry
          )
        );

        setSuccess(
          "Permintaan pencairan ditolak dan dana hold dilepas."
        );
      } else {
        if (transferReference.trim().length < 2) {
          setActionError("Referensi transfer wajib diisi.");
          return;
        }

        const item = actionPanel.withdrawal;
        setActionId(item.id);

        const { data } = await platformApi.post<PlatformWithdrawal>(
          `/api/platform/withdrawals/${item.id}/mark-paid`,
          {
            confirmedTransferred: true,
            transferReference: transferReference.trim(),
            evidenceMetadata: actionNote.trim() || null,
          }
        );

        setWithdrawals((current) =>
          current.map((entry) =>
            entry.id === data.id ? data : entry
          )
        );

        setSuccess(
          "Pencairan selesai dan debit ledger tercatat."
        );
      }

      resetActionPanel();
    } catch (requestError: unknown) {
      setActionError(getApiError(requestError).message);
    } finally {
      setActionId("");
    }
  }

  return (
    <PlatformShell>
      <div className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">Finance Operations</span>
          <h1>Pencairan</h1>
          <p>
            Verifikasi rekening payout dan proses pencairan tenant secara
            manual dengan jejak audit.
          </p>
        </div>
      </div>

      {success ? (
        <div className="platform-success-banner" role="status">
          {success}
        </div>
      ) : null}

      {actionError ? (
        <div className="platform-error-banner" role="alert">
          {actionError}
        </div>
      ) : null}

      {actionPanel ? (
        <section className="platform-panel finance-action-panel">
          <div className="finance-panel-heading">
            <div>
              <h2>
                {actionPanel.kind === "bank-reject"
                  ? "Tolak Rekening Payout"
                  : actionPanel.kind === "withdrawal-reject"
                    ? "Tolak Pencairan"
                    : "Selesaikan Transfer"}
              </h2>
              <p>
                {actionPanel.kind === "bank-reject"
                  ? actionPanel.bank.tenantName
                  : `${actionPanel.withdrawal.tenantName} · ${currency.format(actionPanel.withdrawal.amount)}`}
              </p>
            </div>
          </div>

          <form
            className="platform-finance-action-form"
            onSubmit={submitAction}
          >
            {actionPanel.kind === "withdrawal-paid" ? (
              <label>
                Referensi transfer
                <input
                  value={transferReference}
                  onChange={(event) =>
                    setTransferReference(event.target.value)
                  }
                  placeholder="Contoh: BCA-TRX-20260907-001"
                />
              </label>
            ) : null}

            <label>
              {actionPanel.kind === "withdrawal-paid"
                ? "Catatan / bukti transfer (opsional)"
                : "Alasan"}
              <textarea
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                placeholder={
                  actionPanel.kind === "withdrawal-paid"
                    ? "Catatan rekonsiliasi atau metadata bukti"
                    : "Jelaskan alasan agar dapat ditindaklanjuti"
                }
              />
            </label>

            <div className="platform-table-actions">
              <button
                type="button"
                className="platform-button platform-button-secondary"
                onClick={resetActionPanel}
                disabled={Boolean(actionId)}
              >
                Batal
              </button>
              <button
                type="submit"
                className={
                  actionPanel.kind === "withdrawal-paid"
                    ? "platform-button platform-button-primary"
                    : "platform-button platform-button-danger"
                }
                disabled={Boolean(actionId)}
              >
                {actionId
                  ? "Memproses…"
                  : actionPanel.kind === "withdrawal-paid"
                    ? "Konfirmasi Sudah Transfer"
                    : "Konfirmasi Penolakan"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="platform-panel" aria-busy={loading}>
        <div className="finance-panel-heading">
          <div>
            <h2>Verifikasi Rekening Payout</h2>
            <p>
              Nomor rekening penuh hanya ditampilkan pada control plane
              Super Admin.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="platform-loading" role="status">
            Memuat data finance...
          </div>
        ) : error ? (
          <div className="platform-error-state" role="alert">
            <strong>Data finance belum dapat dimuat</strong>
            <p>{error}</p>
            <button
              type="button"
              className="platform-button platform-button-secondary"
              onClick={() => void loadData()}
            >
              Coba Lagi
            </button>
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="platform-empty-state">
            <strong>Belum ada rekening payout</strong>
            <p>Rekening yang disimpan tenant akan muncul di sini.</p>
          </div>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table platform-withdrawal-bank-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Bank</th>
                  <th>Nomor Rekening</th>
                  <th>Pemilik</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((item) => (
                  <tr key={item.tenantId}>
                    <td>
                      <strong>{item.tenantName}</strong>
                      <small>{item.tenantId}</small>
                    </td>
                    <td>{item.bankName}</td>
                    <td>
                      <code>{item.accountNumber}</code>
                    </td>
                    <td>{item.accountHolderName}</td>
                    <td>
                      <span
                        className={`finance-status finance-status-bank-${item.verificationStatus}`}
                      >
                        {bankStatusLabel[item.verificationStatus]}
                      </span>
                      {item.verificationNote ? (
                        <small>{item.verificationNote}</small>
                      ) : null}
                    </td>
                    <td>
                      {item.verificationStatus === "verified" ? (
                        <span>Terverifikasi</span>
                      ) : (
                        <div className="platform-table-actions">
                          <button
                            type="button"
                            className="platform-button platform-button-primary"
                            disabled={Boolean(actionId)}
                            onClick={() => void verifyBank(item)}
                          >
                            Verifikasi
                          </button>
                          {item.verificationStatus === "pending" ? (
                            <button
                              type="button"
                              className="platform-button platform-button-danger"
                              disabled={Boolean(actionId)}
                              onClick={() => {
                                setActionPanel({
                                  kind: "bank-reject",
                                  bank: item,
                                });
                                setActionNote("");
                              }}
                            >
                              Tolak
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="platform-panel" aria-busy={loading}>
        <div className="finance-panel-heading">
          <div>
            <h2>Antrean Pencairan</h2>
            <p>
              Dana tetap di-hold sampai pencairan dibayar, ditolak, atau
              dibatalkan tenant sebelum processing.
            </p>
          </div>
        </div>

        {!loading && !error && withdrawals.length === 0 ? (
          <div className="platform-empty-state">
            <strong>Belum ada permintaan pencairan</strong>
            <p>Permintaan tenant akan muncul dalam antrean ini.</p>
          </div>
        ) : !loading && !error ? (
          <div className="platform-table-wrap">
            <table className="platform-table platform-withdrawal-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Jumlah</th>
                  <th>Tujuan Transfer</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.tenantName}</strong>
                      <small>
                        {item.requestedByName} · {item.requestedByUsername}
                      </small>
                    </td>
                    <td>
                      <strong>{currency.format(item.amount)}</strong>
                      <small>{item.id}</small>
                    </td>
                    <td>
                      <strong>{item.destinationBankName || "—"}</strong>
                      <small>
                        {item.destinationAccountNumber || "—"} ·{" "}
                        {item.destinationAccountHolderName || "—"}
                      </small>
                    </td>
                    <td>
                      {dateTime.format(new Date(item.requestedAt))}
                    </td>
                    <td>
                      <span
                        className={`finance-status finance-status-${item.status}`}
                      >
                        {statusLabel[item.status]}
                      </span>
                      {item.transferReference ? (
                        <small>{item.transferReference}</small>
                      ) : item.rejectionReason ? (
                        <small>{item.rejectionReason}</small>
                      ) : null}
                    </td>
                    <td>
                      {item.status === "requested" ? (
                        <div className="platform-table-actions">
                          <button
                            type="button"
                            className="platform-button platform-button-primary"
                            disabled={Boolean(actionId)}
                            onClick={() => void startProcessing(item)}
                          >
                            {actionId === item.id
                              ? "Memproses…"
                              : "Mulai Proses"}
                          </button>
                          <button
                            type="button"
                            className="platform-button platform-button-danger"
                            disabled={Boolean(actionId)}
                            onClick={() => {
                              setActionPanel({
                                kind: "withdrawal-reject",
                                withdrawal: item,
                              });
                              setActionNote("");
                            }}
                          >
                            Tolak
                          </button>
                        </div>
                      ) : item.status === "processing" ? (
                        <div className="platform-table-actions">
                          <button
                            type="button"
                            className="platform-button platform-button-primary"
                            disabled={Boolean(actionId)}
                            onClick={() => {
                              setActionPanel({
                                kind: "withdrawal-paid",
                                withdrawal: item,
                              });
                              setTransferReference("");
                              setActionNote("");
                            }}
                          >
                            Selesaikan Transfer
                          </button>
                          <button
                            type="button"
                            className="platform-button platform-button-danger"
                            disabled={Boolean(actionId)}
                            onClick={() => {
                              setActionPanel({
                                kind: "withdrawal-reject",
                                withdrawal: item,
                              });
                              setActionNote("");
                            }}
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span>Sudah diproses</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </PlatformShell>
  );
}
