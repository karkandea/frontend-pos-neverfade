type Props = {
  open: boolean;
  method: string;
  amount: number;
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

import { useRef } from "react";
import { useDialogFocus } from "./useDialogFocus";

export default function PaymentSuccessModal({
  open,
  method,
  amount,
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
          <strong>{rupiah.format(amount)}</strong>
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
