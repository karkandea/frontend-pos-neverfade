type CartItem = {
  id: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
};

type Customer = {
  id: string;
  nama: string;
};

type Props = {
  submitting: boolean;

  items: CartItem[];
  customers: Customer[];

  customerId: string;
  discount: number;
  tax: number;

  subtotal: number;
  total: number;

  paymentMethod: "tunai" | "transfer" | "qris";
  qrisEnabled: boolean;
  qrisSandbox: boolean;
  paid: number;
  change: number;

  onCustomerChange: (value: string) => void;
  onDiscountChange: (value: number) => void;
  onTaxChange: (value: number) => void;
  onPaymentMethodChange: (
    value: "tunai" | "transfer" | "qris"
  ) => void;
  onPaidChange: (value: number) => void;

  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function CartPanel({
    submitting,
  items,
  customers,

  customerId,
  discount,
  tax,

  subtotal,
  total,

  paymentMethod,
  qrisEnabled,
  qrisSandbox,
  paid,
  change,

  onCustomerChange,
  onDiscountChange,
  onTaxChange,
  onPaymentMethodChange,
  onPaidChange,

  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onCheckout,
}: Props) {
  const unitCount = items.reduce(
    (sum, item) => sum + item.qty,
    0
  );
  const checkoutDisabled =
    items.length === 0 ||
    submitting ||
    (paymentMethod === "tunai" && paid < total);

  return (
    <div className="pos-right">
      <div className="pos-cart">
        <div className="cart-header">
          <h3>Keranjang</h3>

          <div className="cart-count">
            {items.length} produk · {unitCount} item
          </div>
        </div>

        <div className="cart-scroll-area">
          <div className="cart-customer-select">
          <label htmlFor="pos-customer">Pelanggan</label>
          <select
            id="pos-customer"
            value={customerId}
            onChange={(e) =>
              onCustomerChange(e.target.value)
            }
          >
            <option value="">
              Pelanggan Umum
            </option>

            {customers.map((customer) => (
              <option
                key={customer.id}
                value={customer.id}
              >
                {customer.nama}
              </option>
            ))}
          </select>
          </div>

          <div className="cart-section-label">Produk</div>

          <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p>Keranjang kosong</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="cart-item"
              >
                <div className="cart-item-info">
                  <strong className="cart-item-name">{item.nama}</strong>

                  <small className="cart-item-price">
                    {rupiah(item.hargaJual)}
                  </small>

                  <div className="cart-item-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label={`Kurangi ${item.nama}`}
                      onClick={() => onDecrease(item.id)}
                    >
                      −
                    </button>

                    <span className="qty-display" aria-live="polite">{item.qty}</span>

                    <button
                      type="button"
                      className="qty-btn"
                      aria-label={`Tambah ${item.nama}`}
                      onClick={() => onIncrease(item.id)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="cart-item-end">
                  <div className="cart-item-total">
                    {rupiah(item.subtotal)}
                  </div>
                  <button
                    type="button"
                    className="btn-remove-item"
                    aria-label={`Hapus ${item.nama} dari keranjang`}
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
          </div>

          <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{rupiah(subtotal)}</span>
          </div>

          <div className="summary-row">
            <span>Diskon</span>

            <div className="discount-input-wrap">
              <input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) =>
                  onDiscountChange(
                    Number(e.target.value)
                  )
                }
              />

              <span>%</span>
            </div>
          </div>

          <div className="summary-row">
            <span>Pajak (PPN)</span>

            <div className="discount-input-wrap">
              <input
                type="number"
                min={0}
                max={100}
                value={tax}
                onChange={(e) =>
                  onTaxChange(
                    Number(e.target.value)
                  )
                }
              />

              <span>%</span>
            </div>
          </div>

          <div className="summary-row total-row">
            <span>TOTAL</span>

            <span>{rupiah(total)}</span>
          </div>
          </div>

          <div className="payment-method">
          <div className="payment-label">
            Metode Pembayaran
          </div>

          <div className="payment-options">
            {(["tunai", "transfer"] as const).map(
              (method) => (
                <button
                  key={method}
                  type="button"
                  className={
                    paymentMethod === method
                      ? "pay-btn active"
                      : "pay-btn"
                  }
                  onClick={() =>
                    onPaymentMethodChange(method)
                  }
                >
                  {method.toUpperCase()}
                </button>
              )
            )}

            {qrisEnabled ? (
              <button
                type="button"
                className={
                  paymentMethod === "qris"
                    ? "pay-btn active"
                    : "pay-btn"
                }
                onClick={() =>
                  onPaymentMethodChange("qris")
                }
              >
                QRIS
              </button>
            ) : null}
          </div>

          {qrisEnabled && qrisSandbox ? (
            <div className="payment-sandbox-warning" role="alert">
              SANDBOX — TIDAK ADA DANA NYATA
            </div>
          ) : null}
          </div>

          {paymentMethod === "tunai" && (
            <div className="cash-input-wrap">
            <label>Uang Diterima</label>

            <input
              type="number"
              value={paid}
              onChange={(e) =>
                onPaidChange(
                  Number(e.target.value)
                )
              }
            />

            <div className="change-row">
              <span>Kembalian</span>

              <span className="change-amount">
                {rupiah(change)}
              </span>
            </div>
            </div>
          )}
        </div>

        <div className="cart-checkout-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClear}
            disabled={items.length === 0 || submitting}
          >
            Kosongkan
          </button>

          <button
            type="button"
            className="btn-checkout"
            disabled={checkoutDisabled}
            onClick={onCheckout}
          >
            Proses Transaksi
          </button>
        </div>
      </div>
    </div>
  );
}
