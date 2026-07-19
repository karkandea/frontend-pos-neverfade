type ReceiptItem = {
  id: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
};

type ReceiptData = {
  noTrx: string;
  total: number;
  subtotal: number;
  discAmt: number;
  taxAmt: number;
  dibayar: number;
  kembalian: number;
  metodePembayaran: string;
  items: ReceiptItem[];
};

type Props = {
  open: boolean;
  receipt: ReceiptData | null;
  header: string;
  footer: string;
  onClose: () => void;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function ReceiptModal({
  open,
  receipt,
  header,
  footer,
  onClose,
}: Props) {
  if (!open || !receipt) return null;

  return (
    <div className="modal-overlay open">
      <div className="modal modal-struk">
        <div className="modal-header">
          <h3>Preview Struk</h3>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="struk-container">
            <div style={{ textAlign: "center" }}>
              <strong>{header}</strong>

              <div style={{ marginTop: 6 }}>
                {receipt.noTrx}
              </div>

              <div>
                {new Date().toLocaleString("id-ID")}
              </div>
            </div>

            <hr />

            {receipt.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div>
                  <div>{item.nama}</div>

                  <small>
                    {item.qty} × {rupiah(item.hargaJual)}
                  </small>
                </div>

                <div>{rupiah(item.subtotal)}</div>
              </div>
            ))}

            <hr />

            <div className="summary-row">
              <span>Subtotal</span>
              <span>{rupiah(receipt.subtotal)}</span>
            </div>

            <div className="summary-row">
              <span>Diskon</span>
              <span>- {rupiah(receipt.discAmt)}</span>
            </div>

            <div className="summary-row">
              <span>Pajak</span>
              <span>{rupiah(receipt.taxAmt)}</span>
            </div>

            <div className="summary-row total-row">
              <strong>Total</strong>
              <strong>{rupiah(receipt.total)}</strong>
            </div>

            <div className="summary-row">
              <span>Pembayaran</span>
              <span>{receipt.metodePembayaran}</span>
            </div>

            <div className="summary-row">
              <span>Dibayar</span>
              <span>{rupiah(receipt.dibayar)}</span>
            </div>

            <div className="summary-row">
              <span>Kembalian</span>
              <span>{rupiah(receipt.kembalian)}</span>
            </div>

            <hr />

            <div
              style={{
                textAlign: "center",
                whiteSpace: "pre-wrap",
              }}
            >
              {footer}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Tutup
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
