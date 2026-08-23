import { useEffect, useRef, useState } from "react";

import { useDialogFocus } from "./useDialogFocus";

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

  paymentMethod: "tunai" | "qris";
  qrisEnabled: boolean;
  qrisSandbox: boolean;
  paid: number;
  change: number;
  totalsValid: boolean;

  onCustomerChange: (value: string) => void;
  onDiscountChange: (value: number) => void;
  onTaxChange: (value: number) => void;
  onPaymentMethodChange: (
    value: "tunai" | "qris"
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
  totalsValid,

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const unitCount = items.reduce(
    (sum, item) => sum + item.qty,
    0
  );
  const checkoutDisabled =
    items.length === 0 ||
    submitting ||
    !totalsValid ||
    (paymentMethod === "tunai" && paid < total);

  useDialogFocus(
    mobileOpen,
    dialogRef,
    () => setMobileOpen(false)
  );

  useEffect(() => {
    if (!mobileOpen || !window.matchMedia("(max-width: 950px)").matches) {
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function decreaseItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (items.length === 1 && item?.qty === 1) {
      setMobileOpen(false);
    }
    onDecrease(id);
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      setMobileOpen(false);
    }
    onRemove(id);
  }

  function clearItems() {
    setMobileOpen(false);
    onClear();
  }

  function checkoutItems() {
    setMobileOpen(false);
    onCheckout();
  }

  return (
    <>
      {items.length > 0 ? (
        <button
          type="button"
          className="mobile-cart-dock"
          onClick={() => setMobileOpen(true)}
          aria-label={`Buka keranjang, ${unitCount} item, total ${rupiah(total)}`}
        >
          <span className="mobile-cart-dock-count">
            <span className="mobile-cart-badge" aria-hidden="true">{unitCount}</span>
            <span>
              <small>Keranjang</small>
              <strong>{rupiah(total)}</strong>
            </span>
          </span>
          <span className="mobile-cart-dock-action">Lihat</span>
        </button>
      ) : null}

      <div
        className={mobileOpen ? "pos-right mobile-cart-open" : "pos-right"}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setMobileOpen(false);
          }
        }}
      >
        <div
          ref={dialogRef}
          className="pos-cart"
          tabIndex={mobileOpen ? -1 : undefined}
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label={mobileOpen ? "Keranjang transaksi" : undefined}
        >
          <div className="cart-header">
            <div>
              <h3>Keranjang</h3>

              <div className="cart-count">
                {items.length} produk · {unitCount} item
              </div>
            </div>

            <button
              type="button"
              className="mobile-cart-close"
              aria-label="Tutup keranjang"
              onClick={() => setMobileOpen(false)}
            >
              ×
            </button>
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
                          onClick={() => decreaseItem(item.id)}
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
                        onClick={() => removeItem(item.id)}
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
                    aria-label="Diskon persen"
                    type="number"
                    inputMode="decimal"
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
                    aria-label="Pajak persen"
                    type="number"
                    inputMode="decimal"
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
              {!totalsValid ? (
                <p className="financial-validation-error" role="alert">
                  Diskon dan pajak harus antara 0–100%.
                </p>
              ) : null}
            </div>

            <div className="payment-method">
              <div className="payment-label">
                Metode Pembayaran
              </div>

              <div className="payment-options">
                <button
                  type="button"
                  className={
                    paymentMethod === "tunai"
                      ? "pay-btn active"
                      : "pay-btn"
                  }
                  aria-pressed={paymentMethod === "tunai"}
                  onClick={() =>
                    onPaymentMethodChange("tunai")
                  }
                >
                  TUNAI
                </button>

                {qrisEnabled ? (
                  <button
                    type="button"
                    className={
                      paymentMethod === "qris"
                        ? "pay-btn active"
                        : "pay-btn"
                    }
                    aria-pressed={paymentMethod === "qris"}
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
                <label htmlFor="cash-received">Uang Diterima</label>

                <input
                  id="cash-received"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={paid}
                  onChange={(e) =>
                    onPaidChange(
                      Number(e.target.value)
                    )
                  }
                />

                <div className="cash-quick-actions">
                  <button
                    type="button"
                    className="cash-quick-btn"
                    disabled={total <= 0 || submitting}
                    onClick={() => onPaidChange(total)}
                  >
                    Uang Pas
                  </button>
                </div>

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
              onClick={clearItems}
              disabled={items.length === 0 || submitting}
            >
              Kosongkan
            </button>

            <button
              type="button"
              className="btn-checkout"
              disabled={checkoutDisabled}
              onClick={checkoutItems}
            >
              <span>Proses Transaksi</span>
              <strong className="checkout-total">{rupiah(total)}</strong>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
