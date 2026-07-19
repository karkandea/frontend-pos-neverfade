import { useMemo } from "react";

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
}: Props) {
  const chips = useMemo(
    () => ["Semua", ...categories.filter(Boolean)],
    [categories]
  );

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
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          value={search}
          placeholder="Cari produk atau scan barcode..."
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="pos-filter-bar">
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

            return (
              <button
                key={product.id}
                type="button"
                className="pos-product-card"
                disabled={outOfStock}
                onClick={() => onAdd(product)}
              >
                <div className="pos-product-top">
                  <div className="pos-product-name">
                    {product.nama}
                  </div>

                  <div className="pos-product-category">
                    {product.kategori}
                  </div>
                </div>

                <div className="pos-product-bottom">
                  <div className="pos-product-price">
                    {formatCurrency(product.hargaJual)}
                  </div>

                  <div
                    className={
                      outOfStock
                        ? "stock-badge danger"
                        : "stock-badge"
                    }
                  >
                    {outOfStock
                      ? "Habis"
                      : `Stok ${product.stok}`}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
