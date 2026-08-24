import { useEffect, useRef, useState } from "react";

import api from "../../lib/api";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  open: boolean;
  method: string;
  amount: number;
  transactionNumber: string;
  transactionId: string;
  onViewReceipt: () => void;
  onNewTransaction: () => void;
};

type CashDetails = {
  dibayar: number;
  kembalian: number;
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
  transactionNumber,
  transactionId,
  onViewReceipt,
  onNewTransaction,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [cashDetails, setCashDetails] = useState<CashDetails | null>(null);

  useDialogFocus(open, dialogRef);

  useEffect(() => {
    if (!open || !transactionId) {
      setCashDetails(null);
      return;
    }

    let active = true;

    void api
      .get<CashDetails>(`/api/transactions/${transactionId}`)
      .then((response) => {
        if (active) {
          setCashDetails({
            dibayar: response.data.dibayar,
            kembalian: response.data.kembalian,
          });
        }
      })
      .catch(() => {
        if (active) {
          setCashDetails(null);
        }
      });

    return () => {
      active = false;
    };
  }, [open, transactionId]);

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

          {cashDetails ? (
            <>
              <div className="payment-success-received">
                <span>Diterima</span>
                <strong>{rupiah.format(cashDetails.dibayar)}</strong>
              </div>

              <div className="payment-success-change" aria-label={`Kembalian ${rupiah.format(cashDetails.kembalian)}`}>
                <span>Kembalian</span>
                <strong>{rupiah.format(cashDetails.kembalian)}</strong>
              </div>
            </>
          ) : null}

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
