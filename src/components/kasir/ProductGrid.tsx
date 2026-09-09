import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "../../types/product";

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
  onQuantityChange: (id: string, quantity: number) => void;
  quantityById: Map<string, number>;
};

type QuantityControlProps = {
  product: Product;
  quantity: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function QuantityControl({
  product,
  quantity,
  onIncrease,
  onDecrease,
  onQuantityChange,
}: QuantityControlProps) {
  const [draft, setDraft] = useState(String(quantity));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(String(quantity));
    }
  }, [quantity]);

  function commitDraft() {
    editingRef.current = false;

    if (draft.trim() === "") {
      setDraft(String(quantity));
      return;
    }

    const parsed = Number(draft);

    if (!Number.isFinite(parsed)) {
      setDraft(String(quantity));
      return;
    }

    const precision =
      product.type === "service"
        ? product.quantityPrecision
        : 0;

    const rounded = Number(
      parsed.toFixed(precision)
    );

    const target =
      product.tracksStock
        ? Math.min(
            product.stok,
            Math.max(
              product.type === "service"
                ? Math.pow(10, -precision)
                : 1,
              rounded
            )
          )
        : Math.max(
            product.type === "service"
              ? Math.pow(10, -precision)
              : 1,
            rounded
          );

    if (
      product.tracksStock &&
      rounded > product.stok
    ) {
      window.alert(
        `Stok ${product.nama} hanya ${product.stok}.`
      );
    }

    onQuantityChange(
      product.id,
      target
    );

    setDraft(String(target));
  }

  return (
    <div
      className="product-qty-control"
      aria-label={`Jumlah ${product.nama}`}
    >
      <button
        type="button"
        aria-label={`Kurangi ${product.nama}`}
        onClick={() => {
          editingRef.current = false;
          onDecrease(product.id);
        }}
      >
        −
      </button>

      <input
        className="product-qty-input"
        type="text"
        inputMode={
          product.type === "service"
            ? "decimal"
            : "numeric"
        }
        enterKeyHint="done"
        value={draft}
        aria-label={`Jumlah ${product.nama}. Ketik jumlah langsung.`}
        title={
          product.tracksStock
            ? `Ketik jumlah langsung. Maksimal ${product.stok}.`
            : "Ketik jumlah langsung."
        }
        onFocus={(event) => {
          editingRef.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(
            product.type === "service"
              ? value.replace(/[^0-9.,]/g, "").replace(",", ".")
              : value.replace(/\D/g, "")
          );
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            editingRef.current = false;
            setDraft(String(quantity));
            event.currentTarget.blur();
          }
        }}
      />

      <button
        type="button"
        aria-label={`Tambah ${product.nama}`}
        disabled={
          product.tracksStock &&
          quantity >= product.stok
        }
        onClick={() => {
          editingRef.current = false;
          onIncrease(product.id);
        }}
      >
        +
      </button>
    </div>
  );
}

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
  onQuantityChange,
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
            const outOfStock =
              product.tracksStock &&
              product.stok <= 0;
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
                    product.tracksStock &&
                    (outOfStock || product.stok <= 5)
                      ? " low"
                      : ""
                  }`}>
                    {product.type === "service"
                      ? `Jasa${product.satuan ? " / " + product.satuan : ""}`
                      : !product.tracksStock
                        ? "Tanpa stok"
                        : outOfStock
                          ? "Habis"
                          : product.stok <= 5
                            ? `Sisa ${product.stok}`
                            : `Stok ${product.stok}`}
                  </div>
                </div>

                <div className="pos-product-action">
                  {quantity > 0 ? (
                    <QuantityControl
                      product={product}
                      quantity={quantity}
                      onIncrease={onIncrease}
                      onDecrease={onDecrease}
                      onQuantityChange={onQuantityChange}
                    />
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
