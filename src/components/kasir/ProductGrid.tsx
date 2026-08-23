import { useEffect, useMemo, useRef } from "react";

type Product = {
  id: string;
  kode: string;
  barcode?: string;
  nama: string;
  kategori: string;
  hargaJual: number;
  stok: number;
};

type Props = {
  products: Product[];
  categories: string[];
  search: string;
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAdd: (product: Product) => void;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  quantityById: Map<string, number>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function ProductGrid({
  products,
  categories,
  search,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onAdd,
  onIncrease,
  onDecrease,
  quantityById,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const chips = useMemo(
    () => ["Semua", ...categories.filter(Boolean)],
    [categories]
  );

  useEffect(() => {
    const desktopKeyboard = window.matchMedia(
      "(min-width: 769px) and (pointer: fine)"
    );

    if (desktopKeyboard.matches) {
      searchRef.current?.focus();
    }
  }, []);

  return (
    <div className="pos-left">
      <div className="pos-search-bar">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={searchRef}
          value={search}
          inputMode="search"
          enterKeyHint="search"
          aria-label="Cari produk atau barcode"
          placeholder="Cari produk atau scan barcode..."
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="pos-filter-bar" aria-label="Kategori produk">
        {chips.map((chip) => {
          const active =
            chip === "Semua"
              ? selectedCategory === ""
              : selectedCategory === chip;

          return (
            <button
              key={chip}
              type="button"
              className={active ? "filter-chip active" : "filter-chip"}
              aria-pressed={active}
              onClick={() =>
                onCategoryChange(chip === "Semua" ? "" : chip)
              }
            >
              {chip}
            </button>
          );
        })}
      </div>

      <div className="pos-products-grid">
        {products.length === 0 ? (
          <div className="table-empty">
            <p>Tidak ada produk.</p>
          </div>
        ) : (
          products.map((product) => {
            const outOfStock = product.stok <= 0;
            const quantity = quantityById.get(product.id) ?? 0;

            return (
              <article
                key={product.id}
                className={`pos-product-card${
                  quantity > 0 ? " selected" : ""
                }${outOfStock ? " out-of-stock" : ""}`}
              >
                <div className="pos-product-top">
                  <div className="pos-product-name">
                    {product.nama}
                  </div>

                  <div className="pos-product-cat">
                    {product.kategori}
                  </div>
                </div>

                <div className="pos-product-bottom">
                  <div className="pos-product-price">
                    {formatCurrency(product.hargaJual)}
                  </div>

                  <div className={`pos-product-stock${
                    outOfStock || product.stok <= 5
                      ? " low"
                      : ""
                  }`}>
                    {outOfStock ? "Habis" : product.stok <= 5 ? `Sisa ${product.stok}` : `Stok ${product.stok}`}
                  </div>
                </div>

                <div className="pos-product-action">
                  {quantity > 0 ? (
                    <div className="product-qty-control" aria-label={`Jumlah ${product.nama}`}>
                      <button
                        type="button"
                        aria-label={`Kurangi ${product.nama}`}
                        onClick={() => onDecrease(product.id)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{quantity}</span>
                      <button
                        type="button"
                        aria-label={`Tambah ${product.nama}`}
                        disabled={quantity >= product.stok}
                        onClick={() => onIncrease(product.id)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="product-add-btn"
                      aria-label={`Tambah ${product.nama} ke keranjang`}
                      disabled={outOfStock}
                      onClick={() => onAdd(product)}
                    >
                      <span aria-hidden="true">+</span>
                      Tambah
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
