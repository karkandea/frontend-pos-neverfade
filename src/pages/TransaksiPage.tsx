import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AppShell from "../components/layout/AppShell";
import { useDialogFocus } from "../components/kasir/useDialogFocus";
import api from "../lib/api";

type TransactionItem = {
  id: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
};

type Transaction = {
  id: string;
  noTrx: string;
  tanggal: string;
  kasir: string;
  customerId: string | null;
  customerNama: string;
  items: TransactionItem[];
  subtotal: number;
  disc: number;
  tax: number;
  discAmt: number;
  taxAmt: number;
  total: number;
  metodePembayaran: string;
  dibayar: number;
  kembalian: number;
  status: "pending_payment" | "paid" | "failed";
  paymentStatus: string | null;
  paymentFailureCode: string | null;
};

function transactionStatus(transaction: Transaction) {
  if (transaction.status === "paid") return { label: "Selesai", tone: "success" };
  if (transaction.status === "pending_payment") return { label: "Pending pembayaran", tone: "pending" };
  if (transaction.paymentFailureCode === "PAYMENT_REQUEST_EXPIRED") return { label: "Kedaluwarsa", tone: "failed" };
  if (transaction.paymentFailureCode === "PAYMENT_REQUEST_CANCELED") return { label: "Dibatalkan", tone: "failed" };
  return { label: "Gagal", tone: "failed" };
}

function getErrorMessage(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return "Terjadi kesalahan.";
  }

  const apiError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        title?: string;
      };
    };
  };

  return (
    apiError.response?.data?.message ??
    apiError.response?.data?.title ??
    apiError.message ??
    "Terjadi kesalahan."
  );
}

function rupiah(value: number) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function formatTanggal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }
  ).format(date);
}

function csvCell(value: string | number) {
  const text = String(value ?? "");

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
}

export default function TransaksiPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  const [selected, setSelected] =
    useState<Transaction | null>(null);
  const detailDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(Boolean(selected), detailDialogRef, () => setSelected(null));

  useEffect(() => {
    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setLoading(true);
          setLoadError("");

          try {
            const query =
              search.trim();

            const response =
              await api.get<Transaction[]>(
                "/api/transactions",
                {
                  params: query
                    ? {
                        search: query,
                      }
                    : undefined,
                  signal:
                    controller.signal,
                }
              );

            setTransactions(
              response.data
            );
          } catch (error) {
            if (
              controller.signal
                .aborted
            ) {
              return;
            }

            setLoadError(
              getErrorMessage(error)
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setLoading(false);
            }
          }
        },
        250
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, reloadKey]);

  const exportRows =
    useMemo(
      () =>
        transactions.map(
          (transaction) => [
            transaction.noTrx,
            formatTanggal(
              transaction.tanggal
            ),
            transaction.customerNama ||
              "Umum",
            transaction.kasir,
            transaction.total,
            transaction.metodePembayaran,
            transactionStatus(transaction).label,
          ]
        ),
      [transactions]
    );

  function exportCsv() {
    if (
      exportRows.length === 0
    ) {
      window.alert(
        "Tidak ada transaksi untuk diexport."
      );
      return;
    }

    const rows = [
      [
        "No Transaksi",
        "Tanggal",
        "Pelanggan",
        "Kasir",
        "Total",
        "Metode Pembayaran",
        "Status",
      ],
      ...exportRows,
    ];

    const csv =
      rows
        .map((row) =>
          row
            .map((value) =>
              csvCell(value)
            )
            .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [`\uFEFF${csv}`],
        {
          type:
            "text/csv;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    anchor.href = url;
    anchor.download =
      `transaksi-${today}.csv`;

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <section
        id="sec-transaksi"
        className="content-section active"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Transaksi
            </h2>

            <p className="section-sub">
              Riwayat transaksi penjualan
            </p>
          </div>

          <div className="section-actions">
            <div className="search-bar">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />

                <line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                />
              </svg>

              <input
                type="text"
                id="transaksi-search"
                placeholder="Cari transaksi..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              id="btn-export-transaksi"
              onClick={exportCsv}
            >
              Export
            </button>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <p>
              Memuat transaksi...
            </p>
          ) : loadError ? (
            <div className="table-empty">
              <p>{loadError}</p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setReloadKey(
                    (value) =>
                      value + 1
                  )
                }
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Tanggal</th>
                    <th>
                      Pelanggan
                    </th>
                    <th>Kasir</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody id="transaksi-tbody">
                  {transactions.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center"
                      >
                        Belum ada data.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(
                      (transaction) => (
                        <tr
                          key={
                            transaction.id
                          }
                        >
                          <td>
                            {
                              transaction.noTrx
                            }
                          </td>

                          <td>
                            {formatTanggal(
                              transaction.tanggal
                            )}
                          </td>

                          <td>
                            {transaction.customerNama ||
                              "Umum"}
                          </td>

                          <td>
                            {
                              transaction.kasir
                            }
                          </td>

                          <td>
                            {rupiah(
                              transaction.total
                            )}
                          </td>

                          <td>
                            <span className={`status-badge ${transactionStatus(transaction).tone}`}>
                              {transactionStatus(transaction).label}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                setSelected(
                                  transaction
                                )
                              }
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className={
            "modal-overlay" +
            (selected
              ? " open"
              : "")
          }
        >
          {selected && (
            <div
              ref={detailDialogRef}
              tabIndex={-1}
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-detail-title"
            >
              <div className="modal-header">
                <div>
                  <h3 id="transaction-detail-title">
                    Detail Transaksi
                  </h3>

                  <p>
                    {
                      selected.noTrx
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  aria-label="Tutup detail transaksi"
                  onClick={() =>
                    setSelected(null)
                  }
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>
                      Tanggal
                    </label>

                    <div>
                      {formatTanggal(
                        selected.tanggal
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <div>
                      <span className={`status-badge ${transactionStatus(selected).tone}`}>
                        {transactionStatus(selected).label}
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Kasir
                    </label>

                    <div>
                      {
                        selected.kasir
                      }
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Pelanggan
                    </label>

                    <div>
                      {selected.customerNama ||
                        "Umum"}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Pembayaran
                    </label>

                    <div>
                      {
                        selected.metodePembayaran
                      }
                    </div>
                  </div>
                </div>

                <div className="table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>
                            Item
                          </th>
                          <th>
                            Harga
                          </th>
                          <th>
                            Qty
                          </th>
                          <th>
                            Subtotal
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selected.items.map(
                          (item) => (
                            <tr
                              key={
                                item.id
                              }
                            >
                              <td>
                                {
                                  item.nama
                                }
                              </td>

                              <td>
                                {rupiah(
                                  item.hargaJual
                                )}
                              </td>

                              <td>
                                {
                                  item.qty
                                }
                              </td>

                              <td>
                                {rupiah(
                                  item.subtotal
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>
                      Subtotal
                    </label>

                    <div>
                      {rupiah(
                        selected.subtotal
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Diskon
                    </label>

                    <div>
                      {rupiah(
                        selected.discAmt
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Pajak
                    </label>

                    <div>
                      {rupiah(
                        selected.taxAmt
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Total
                    </label>

                    <strong>
                      {rupiah(
                        selected.total
                      )}
                    </strong>
                  </div>

                  <div className="form-group">
                    <label>
                      Dibayar
                    </label>

                    <div>
                      {rupiah(
                        selected.dibayar
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Kembalian
                    </label>

                    <div>
                      {rupiah(
                        selected.kembalian
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setSelected(null)
                  }
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
