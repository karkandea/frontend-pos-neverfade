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
  return (
    <div className="pos-right">
      <div className="pos-cart">
        <div className="cart-header">
          <h3>Keranjang</h3>

          <div className="cart-count">
            {items.length} item
          </div>
        </div>

        <div className="cart-customer-select">
          <select
            value={customerId}
            onChange={(e) =>
              onCustomerChange(e.target.value)
            }
          >
            <option value="">
              — Pilih Pelanggan (Opsional) —
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
                  <strong>{item.nama}</strong>

                  <small>
                    {rupiah(item.hargaJual)}
                  </small>
                </div>

                <div className="cart-item-actions">
                  <button
                    type="button"
                    onClick={() =>
                      onDecrease(item.id)
                    }
                  >
                    −
                  </button>

                  <span>{item.qty}</span>

                  <button
                    type="button"
                    onClick={() =>
                      onIncrease(item.id)
                    }
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onRemove(item.id)
                    }
                  >
                    ×
                  </button>
                </div>

                <div className="cart-item-subtotal">
                  {rupiah(item.subtotal)}
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
            {(["tunai", "transfer", "qris"] as const).map(
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
          </div>
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

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClear}
          >
            Kosongkan
          </button>

          <button
            type="button"
            className="btn-checkout"
            disabled={items.length === 0 || submitting}
            onClick={onCheckout}
            style={{ flex: 1 }}
          >
            Proses Transaksi
          </button>
        </div>
      </div>
    </div>
  );
}
