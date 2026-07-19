import { useEffect, useMemo, useState } from "react";

import CartPanel from "../components/kasir/CartPanel";
import ProductGrid from "../components/kasir/ProductGrid";
import ReceiptModal from "../components/kasir/ReceiptModal";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";

type Product = {
  id: string;
  kode: string;
  barcode?: string;
  nama: string;
  kategori: string;
  hargaJual: number;
  stok: number;
};

type Customer = {
  id: string;
  nama: string;
};

type CartItem = {
  id: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
};

type Settings = {
  defaultTax: number;
  headerStruk: string;
  footerStruk: string;
};

type ReceiptData = {
  noTrx: string;
  subtotal: number;
  discAmt: number;
  taxAmt: number;
  total: number;
  dibayar: number;
  kembalian: number;
  metodePembayaran: string;
  items: CartItem[];
};

type PaymentMethod = "tunai" | "transfer" | "qris";

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Transaksi gagal diproses.";
  }

  const apiError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return (
    apiError.response?.data?.message ??
    apiError.message ??
    "Transaksi gagal diproses."
  );
}

export default function TransactionPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");

  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("tunai");

  const [paid, setPaid] = useState(0);

  const [settings, setSettings] = useState<Settings>({
    defaultTax: 0,
    headerStruk: "",
    footerStruk: "",
  });

  const [receipt, setReceipt] =
    useState<ReceiptData | null>(null);

  const [receiptOpen, setReceiptOpen] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const categories = useMemo(
    () => [
      ...new Set(
        allProducts
          .map((product) => product.kategori)
          .filter(Boolean)
      ),
    ],
    [allProducts]
  );

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedCategory =
      kategori.trim().toLowerCase();

    return allProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.nama.toLowerCase().includes(query) ||
        product.kode.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query);

      const matchesCategory =
        !selectedCategory ||
        product.kategori.toLowerCase() ===
          selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allProducts, search, kategori]);

  useEffect(() => {
    void loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        productResponse,
        customerResponse,
        settingsResponse,
      ] = await Promise.all([
        api.get<Product[]>("/api/products"),
        api.get<Customer[]>("/api/customers"),
        api.get<Settings>("/api/settings"),
      ]);

      setAllProducts(productResponse.data);
      setCustomers(customerResponse.data);
      setSettings(settingsResponse.data);
      setTax(
        Number(
          settingsResponse.data.defaultTax ?? 0
        )
      );
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function reloadProducts() {
    const response =
      await api.get<Product[]>("/api/products");

    setAllProducts(response.data);
  }

  function getProduct(productId: string) {
    return allProducts.find(
      (product) => product.id === productId
    );
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing && existing.qty >= product.stok) {
        window.alert(
          `Stok ${product.nama} hanya ${product.stok}.`
        );

        return current;
      }

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                subtotal:
                  (item.qty + 1) *
                  item.hargaJual,
              }
            : item
        );
      }

      if (product.stok <= 0) {
        window.alert(
          `Stok ${product.nama} habis.`
        );

        return current;
      }

      return [
        ...current,
        {
          id: product.id,
          nama: product.nama,
          hargaJual: product.hargaJual,
          qty: 1,
          subtotal: product.hargaJual,
        },
      ];
    });
  }

  function increase(productId: string) {
    const product = getProduct(productId);

    setCart((current) =>
      current.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (!product) {
          return item;
        }

        if (item.qty >= product.stok) {
          window.alert(
            `Stok ${product.nama} hanya ${product.stok}.`
          );

          return item;
        }

        const qty = item.qty + 1;

        return {
          ...item,
          qty,
          subtotal: qty * item.hargaJual,
        };
      })
    );
  }

  function decrease(productId: string) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const qty = item.qty - 1;

          return {
            ...item,
            qty,
            subtotal: qty * item.hargaJual,
          };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function remove(productId: string) {
    setCart((current) =>
      current.filter(
        (item) => item.id !== productId
      )
    );
  }

  function clearCart() {
    setCart([]);
    setPaid(0);
    setCustomerId("");
    setDiscount(0);
    setTax(settings.defaultTax ?? 0);
    setPaymentMethod("tunai");
  }

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.subtotal,
        0
      ),
    [cart]
  );

  const discAmt = useMemo(
    () => subtotal * (discount / 100),
    [subtotal, discount]
  );

  const taxAmt = useMemo(
    () =>
      (subtotal - discAmt) * (tax / 100),
    [subtotal, discAmt, tax]
  );

  const total = useMemo(
    () => subtotal - discAmt + taxAmt,
    [subtotal, discAmt, taxAmt]
  );

  const change = useMemo(() => {
    if (paymentMethod !== "tunai") {
      return 0;
    }

    return Math.max(0, paid - total);
  }, [paymentMethod, paid, total]);

  function validateStock() {
    for (const item of cart) {
      const product = getProduct(item.id);

      if (!product) {
        return `${item.nama} tidak ditemukan. Muat ulang halaman.`;
      }

      if (item.qty > product.stok) {
        return `Stok ${item.nama} hanya ${product.stok}.`;
      }
    }

    return "";
  }

  async function checkout() {
    if (submitting || cart.length === 0) {
      return;
    }

    const stockError = validateStock();

    if (stockError) {
      window.alert(stockError);
      return;
    }

    if (
      paymentMethod === "tunai" &&
      paid < total
    ) {
      window.alert("Uang diterima kurang.");
      return;
    }

    const paidAmount =
      paymentMethod === "tunai"
        ? paid
        : total;

    const changeAmount =
      paymentMethod === "tunai"
        ? change
        : 0;

    const receiptItems = cart.map(
      (item) => ({ ...item })
    );

    setSubmitting(true);

    try {
      const payload = {
        customerId: customerId || null,
        items: cart.map((item) => ({
          id: item.id,
          nama: item.nama,
          hargaJual: item.hargaJual,
          qty: item.qty,
          subtotal: item.subtotal,
        })),
        subtotal,
        disc: discount,
        tax,
        discAmt,
        taxAmt,
        total,
        metodePembayaran: paymentMethod,
        dibayar: paidAmount,
        kembalian: changeAmount,
      };

      const response = await api.post(
        "/api/transactions",
        payload
      );

      setReceipt({
        noTrx: response.data.noTrx,
        subtotal,
        discAmt,
        taxAmt,
        total,
        dibayar: paidAmount,
        kembalian: changeAmount,
        metodePembayaran: paymentMethod,
        items: receiptItems,
      });

      setReceiptOpen(true);
      clearCart();

      await reloadProducts();
    } catch (error) {
      window.alert(getErrorMessage(error));

      try {
        await reloadProducts();
      } catch {
        // Error checkout utama sudah ditampilkan.
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section className="content-section active">
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
            type="button"
            className="btn-secondary"
            onClick={clearCart}
            disabled={submitting}
          >
            Kosongkan
          </button>
        </div>

        {loading ? (
          <div className="table-card">
            <p>Memuat kasir...</p>
          </div>
        ) : loadError ? (
          <div className="table-card">
            <p>{loadError}</p>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadInitial()}
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="pos-layout">
            <ProductGrid
              products={products}
              categories={categories}
              search={search}
              selectedCategory={kategori}
              onSearchChange={setSearch}
              onCategoryChange={setKategori}
              onAdd={addToCart}
            />

            <CartPanel
              submitting={submitting}
              items={cart}
              customers={customers}
              customerId={customerId}
              discount={discount}
              tax={tax}
              subtotal={subtotal}
              total={total}
              paymentMethod={paymentMethod}
              paid={paid}
              change={change}
              onCustomerChange={setCustomerId}
              onDiscountChange={setDiscount}
              onTaxChange={setTax}
              onPaymentMethodChange={
                setPaymentMethod
              }
              onPaidChange={setPaid}
              onIncrease={increase}
              onDecrease={decrease}
              onRemove={remove}
              onClear={clearCart}
              onCheckout={() => void checkout()}
            />
          </div>
        )}

        <ReceiptModal
          open={receiptOpen}
          receipt={receipt}
          header={settings.headerStruk}
          footer={settings.footerStruk}
          onClose={() =>
            setReceiptOpen(false)
          }
        />
      </section>
    </AppShell>
  );
}
