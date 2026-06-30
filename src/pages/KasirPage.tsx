import AppShell from "../components/layout/AppShell";

export default function KasirPage() {
  return (
    <AppShell>
      <section
        id="sec-kasir"
        className="content-section active"
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Kasir
            </h2>

            <p className="section-sub">
              Point of Sale
            </p>
          </div>

          <button
            className="btn-secondary"
            id="btn-clear-cart"
          >
            Kosongkan
          </button>
        </div>
        <div className="pos-layout">
          <div className="pos-left">
            <div className="pos-search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                type="text"
                id="pos-search"
                placeholder="Cari produk atau scan barcode..."
              />
            </div>

            <div
              className="pos-filter-bar"
              id="pos-filter-bar"
            >
              <button
                className="filter-chip active"
                data-cat="all"
              >
                Semua
              </button>
            </div>

            <div
              className="pos-products-grid"
              id="pos-products-grid"
            />
          </div>

          <div className="pos-right">
            <div className="pos-cart">
              <div className="cart-header">
                <h3>Keranjang</h3>

                <div
                  className="cart-count"
                  id="cart-count"
                >
                  0 item
                </div>
              </div>
              <div className="cart-customer-select">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>

                <select id="cart-customer">
                  <option value="">
                    — Pilih Pelanggan (Opsional) —
                  </option>
                </select>
              </div>

              <div
                className="cart-items"
                id="cart-items"
              >
                <div className="cart-empty">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>

                  <p>Keranjang kosong</p>
                </div>
              </div>

              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span id="cart-subtotal">Rp 0</span>
                </div>

                <div className="summary-row total-row">
                  <span>TOTAL</span>
                  <span id="cart-total">Rp 0</span>
                </div>
              </div>

              <button
                className="btn-checkout"
                id="btn-checkout"
              >
                Proses Transaksi
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
