import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import type { QrisPayment } from "../../types/payment";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  payment: QrisPayment | null;
  status: string | null;
  statusError: string;
  saleContextReady: boolean;
  saleContextError: string;
  sandbox: boolean;
  onCloseFailed: () => void;
  onRetryStatus: () => void;
  onRetrySaleContext: () => void;
  receiptLoading: boolean;
  receiptError: string;
  receiptReady: boolean;
  cancelling: boolean;
  onCancel: () => void;
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

export default function QrisPaymentModal({
  payment,
  status,
  statusError,
  saleContextReady,
  saleContextError,
  sandbox,
  onCloseFailed,
  onRetryStatus,
  onRetrySaleContext,
  receiptLoading,
  receiptError,
  receiptReady,
  cancelling,
  onCancel,
  onRetryReceipt,
  onViewReceipt,
  onNewTransaction,
}: Props) {
  const [qrImage, setQrImage] = useState<{
    source: string;
    value: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    if (!payment?.qrString) {
      return () => {
        active = false;
      };
    }

    void QRCode.toDataURL(payment.qrString, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then((image) => {
      if (active) {
        setQrImage({
          source: payment.qrString!,
          value: image,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [payment?.qrString]);

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
  const currentQrImage =
    qrImage?.source === payment?.qrString
      ? qrImage?.value ?? ""
      : "";
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
        aria-labelledby="qris-payment-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="qris-payment-title">Pembayaran QRIS</h3>
            <p
              className={`qris-status ${
                paid ? "paid" : failed ? "failed" : "pending"
              }`}
            >
              {paid
                ? "Pembayaran berhasil"
                : expired
                  ? "Pembayaran kedaluwarsa"
                  : displayExpired
                    ? "Menunggu kepastian pembayaran"
                  : failed
                    ? "Pembayaran gagal"
                    : "Menunggu pembayaran"}
            </p>
          </div>
        </div>

        <div className="modal-body qris-payment-body">
          {sandbox ? (
            <div className="payment-sandbox-warning" role="alert">
              SANDBOX — TIDAK ADA DANA NYATA
            </div>
          ) : null}

          <div className="qris-reference">
            <span>Referensi pembayaran</span>
            <strong>{payment.providerPaymentRequestId}</strong>
            {expiresAt ? <small>Berlaku sampai {expiresAt} WIB</small> : null}
          </div>

          {paid ? (
            <div className="payment-success-state" role="status">
              <div className="payment-success-icon" aria-hidden="true">✓</div>
              <strong>QRIS berhasil dibayar</strong>
              <span>{rupiah(payment.amount)}</span>
              <small>
                Transaksi {payment.transactionId}
              </small>
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
                  ? "Waktu pembayaran telah habis. Tidak ada transaksi yang diselesaikan."
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

              {!displayExpired ? <div className="qris-code-frame">
                {currentQrImage ? (
                  <img
                    src={currentQrImage}
                    alt="Kode QRIS pembayaran"
                  />
                ) : (
                <div className="qris-code-loading">Menyiapkan QRIS…</div>
                )}
              </div> : null}

              {displayExpired ? (
                <div className="qris-status-error" role="alert">
                  <strong>Waktu scan telah berakhir</strong>
                  <p>Jangan meminta pelanggan membayar ulang. Konfirmasi provider dapat datang terlambat; periksa status atau batalkan kode ini secara aman.</p>
                </div>
              ) : <ol className="qris-instructions">
                <li>Buka aplikasi pembayaran yang mendukung QRIS.</li>
                <li>Scan kode QR dan pastikan nominalnya sesuai.</li>
                <li>
                  Selesaikan pembayaran. Status akan diperbarui otomatis.
                </li>
              </ol>}

              <div className="qris-waiting" aria-live="polite">
                <span className="qris-spinner" aria-hidden="true" />
                Menunggu konfirmasi aman dari server
              </div>

              {statusError ? (
                <div className="qris-status-error" role="alert">
                  <p>{statusError}</p>
                  <button type="button" className="btn-secondary" onClick={onRetryStatus}>
                    Periksa Status Sekarang
                  </button>
                </div>
              ) : null}
              <div className="qris-pending-actions">
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
