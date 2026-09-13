import { useEffect, useRef, useState } from "react";

import type { HostedPayment } from "../../types/payment";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  payment: HostedPayment | null;
  status: string | null;
  statusError: string;
  saleContextReady: boolean;
  saleContextError: string;
  sandbox: boolean;
  receiptLoading: boolean;
  receiptError: string;
  receiptReady: boolean;
  cancelling: boolean;
  onResumeCheckout: () => void;
  onRetryStatus: () => void;
  onCancel: () => void;
  onCloseFailed: () => void;
  onRetrySaleContext: () => void;
  onRetryReceipt: () => void;
  onViewReceipt: () => void;
  onNewTransaction: () => void;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function HostedPaymentModal({
  payment,
  status,
  statusError,
  saleContextReady,
  saleContextError,
  sandbox,
  receiptLoading,
  receiptError,
  receiptReady,
  cancelling,
  onResumeCheckout,
  onRetryStatus,
  onCancel,
  onCloseFailed,
  onRetrySaleContext,
  onRetryReceipt,
  onViewReceipt,
  onNewTransaction,
}: Props) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const paid = status === "paid";
  const expired = status === "expired";
  const failed = status === "failed" || expired;
  const pending = status === "pending" || status === "creating";
  const displayExpired = pending && Boolean(
    payment?.expiresAt && new Date(payment.expiresAt).getTime() <= currentTime
  );
  const expiresAt = payment?.expiresAt
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(payment.expiresAt))
    : null;

  useDialogFocus(Boolean(payment && status), dialogRef, failed ? onCloseFailed : undefined);

  if (!payment || !status) {
    return null;
  }

  return (
    <div className="modal-overlay open">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal qris-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hosted-payment-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="hosted-payment-title">Xendit Checkout</h3>
            <p className={`qris-status ${paid ? "paid" : failed ? "failed" : "pending"}`}>
              {paid
                ? "Pembayaran berhasil"
                : expired
                  ? "Checkout kedaluwarsa"
                  : failed
                    ? "Pembayaran gagal"
                    : "Menunggu pembayaran"}
            </p>
          </div>
        </div>

        <div className="modal-body qris-payment-body">
          {sandbox ? (
            <div className="payment-sandbox-warning" role="alert">
              <strong>SANDBOX — TIDAK ADA DANA NYATA</strong>
            </div>
          ) : null}

          <div className="qris-reference">
            <span>Referensi checkout</span>
            <strong>{payment.providerSessionId}</strong>
            {expiresAt ? <small>Berlaku sampai {expiresAt} WIB</small> : null}
          </div>

          {paid ? (
            <div className="payment-success-state" role="status">
              <div className="payment-success-icon" aria-hidden="true">✓</div>
              <strong>Pembayaran Xendit berhasil</strong>
              <span>{rupiah(payment.amount)}</span>
              <small>Transaksi {payment.transactionId}</small>
              {receiptLoading ? (
                <p aria-live="polite">Memuat detail struk…</p>
              ) : receiptError ? (
                <div className="receipt-recovery" role="alert">
                  <p>{receiptError}</p>
                  <button type="button" className="btn-secondary" onClick={onRetryReceipt}>
                    Coba Muat Struk Lagi
                  </button>
                </div>
              ) : receiptReady ? (
                <p>Detail transaksi siap dilihat atau dicetak.</p>
              ) : null}
            </div>
          ) : failed ? (
            <div className="qris-failure" role="alert">
              <strong>Transaksi belum diselesaikan</strong>
              <p>
                {expired
                  ? "Waktu checkout telah habis. Tidak ada transaksi yang diselesaikan."
                  : "Pembayaran tidak berhasil. Tidak ada transaksi yang diselesaikan."}
              </p>
              {saleContextError ? (
                <div className="receipt-recovery">
                  <p>{saleContextError}</p>
                  <button type="button" className="btn-secondary" onClick={onRetrySaleContext}>
                    Pulihkan Keranjang
                  </button>
                </div>
              ) : null}
            </div>
          ) : pending ? (
            <>
              <div className="qris-amount">
                <span>Total pembayaran</span>
                <strong>{rupiah(payment.amount)}</strong>
              </div>

              {displayExpired ? (
                <div className="qris-status-error" role="alert">
                  <strong>Waktu checkout telah berakhir</strong>
                  <p>Periksa status sebelum membuat pembayaran baru.</p>
                </div>
              ) : (
                <ol className="qris-instructions">
                  <li>Buka halaman Xendit Checkout.</li>
                  <li>Pilih e-wallet, transfer bank, kartu, atau channel aktif lainnya.</li>
                  <li>Selesaikan pembayaran lalu kembali ke NeverFade POS.</li>
                </ol>
              )}

              {statusError ? (
                <div className="qris-status-error" role="alert">
                  <p>{statusError}</p>
                </div>
              ) : null}

              <div className="qris-pending-actions">
                {!displayExpired ? (
                  <button type="button" className="btn-primary" onClick={onResumeCheckout} disabled={cancelling}>
                    Buka Xendit
                  </button>
                ) : null}
                <button type="button" className="btn-secondary" onClick={onRetryStatus} disabled={cancelling}>
                  Periksa Status
                </button>
                <button type="button" className="btn-danger" onClick={onCancel} disabled={cancelling}>
                  {cancelling ? "Membatalkan…" : "Customer Batal"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {paid ? (
          <div className="modal-footer qris-success-actions">
            <button type="button" className="btn-secondary" onClick={onNewTransaction}>
              Transaksi Baru
            </button>
            <button type="button" className="btn-primary" disabled={!receiptReady} onClick={onViewReceipt}>
              Lihat Struk
            </button>
          </div>
        ) : failed ? (
          <div className="modal-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={onCloseFailed}
              disabled={!saleContextReady || Boolean(saleContextError)}
            >
              Kembali ke Keranjang
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
