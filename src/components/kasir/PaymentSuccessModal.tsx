import { useRef } from "react";

import { useDialogFocus } from "./useDialogFocus";

type Props = {
  open: boolean;
  method: string;
  amount: number;
  paid: number;
  change: number;
  transactionNumber: string;
  transactionId: string;
  onViewReceipt: () => void;
  onNewTransaction: () => void;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function PaymentSuccessModal({
  open,
  method,
  amount,
  paid,
  change,
  transactionNumber,
  transactionId,
  onViewReceipt,
  onNewTransaction,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus(open, dialogRef);

  if (!open) return null;

  return (
    <div className="modal-overlay open">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal payment-result-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-success-title"
      >
        <div className="modal-body payment-success-state" role="status">
          <div className="payment-success-icon" aria-hidden="true">✓</div>
          <h3 id="payment-success-title">Transaksi Berhasil</h3>

          <div className="payment-success-total">
            <span>Total</span>
            <strong>{rupiah.format(amount)}</strong>
          </div>

          <div className="payment-success-received">
            <span>Diterima</span>
            <strong>{rupiah.format(paid)}</strong>
          </div>

          <div
            className="payment-success-change"
            aria-label={`Kembalian ${rupiah.format(change)}`}
          >
            <span>Kembalian</span>
            <strong>{rupiah.format(change)}</strong>
          </div>

          <dl className="payment-success-details">
            <div><dt>Metode</dt><dd>{method.toUpperCase()}</dd></div>
            <div><dt>No. transaksi</dt><dd>{transactionNumber}</dd></div>
            <div><dt>ID transaksi</dt><dd>{transactionId}</dd></div>
          </dl>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onNewTransaction}>
            Transaksi Baru
          </button>
          <button type="button" className="btn-primary" onClick={onViewReceipt}>
            Lihat Struk
          </button>
        </div>
      </div>
    </div>
  );
}
