import { useEffect, useState } from "react";
import QRCode from "qrcode";

import type { QrisPayment } from "../../types/payment";

type Props = {
  payment: QrisPayment | null;
  status: string | null;
  statusError: string;
  onCloseFailed: () => void;
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
  onCloseFailed,
}: Props) {
  const [qrImage, setQrImage] = useState<{
    source: string;
    value: string;
  } | null>(null);

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

  if (!payment || !status) {
    return null;
  }

  const failed = status === "failed";
  const currentQrImage =
    qrImage?.source === payment.qrString
      ? qrImage.value
      : "";

  return (
    <div className="modal-overlay open">
      <div
        className="modal qris-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qris-payment-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="qris-payment-title">Pembayaran QRIS</h3>
            <p className={`qris-status ${failed ? "failed" : "pending"}`}>
              {failed ? "Pembayaran gagal" : "Menunggu pembayaran"}
            </p>
          </div>
        </div>

        <div className="modal-body qris-payment-body">
          {failed ? (
            <div className="qris-failure" role="alert">
              <strong>Transaksi belum diselesaikan</strong>
              <p>
                Pembayaran tidak berhasil. Keranjang tetap tersimpan dan
                belum ada transaksi yang diselesaikan.
              </p>
            </div>
          ) : (
            <>
              <div className="qris-amount">
                <span>Total pembayaran</span>
                <strong>{rupiah(payment.amount)}</strong>
              </div>

              <div className="qris-code-frame">
                {currentQrImage ? (
                  <img
                    src={currentQrImage}
                    alt="Kode QRIS pembayaran"
                  />
                ) : (
                  <div className="qris-code-loading">Menyiapkan QRIS...</div>
                )}
              </div>

              <ol className="qris-instructions">
                <li>Buka aplikasi pembayaran yang mendukung QRIS.</li>
                <li>Scan kode QR dan pastikan nominalnya sesuai.</li>
                <li>
                  Selesaikan pembayaran. Status akan diperbarui otomatis.
                </li>
              </ol>

              <div className="qris-waiting" aria-live="polite">
                <span className="qris-spinner" aria-hidden="true" />
                Menunggu konfirmasi aman dari server
              </div>

              {statusError ? (
                <p className="qris-status-error" role="status">
                  {statusError}
                </p>
              ) : null}
            </>
          )}
        </div>

        {failed ? (
          <div className="modal-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={onCloseFailed}
            >
              Kembali ke Keranjang
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
