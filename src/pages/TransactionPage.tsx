import { useEffect, useMemo, useRef, useState } from "react";

import CartPanel from "../components/kasir/CartPanel";
import ProductGrid from "../components/kasir/ProductGrid";
import QrisPaymentModal from "../components/kasir/QrisPaymentModal";
import ReceiptModal from "../components/kasir/ReceiptModal";
import PaymentSuccessModal from "../components/kasir/PaymentSuccessModal";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import type {
  PaymentCapabilities,
  PaymentStatus,
  QrisPayment,
} from "../types/payment";

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
  transactionId: string;
  transactionDate: string;
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

type PaymentMethod = "tunai" | "qris";

type TransactionResponse = ReceiptData & {
  id: string;
  createdAt?: string;
};

const PAYMENT_POLL_INTERVAL_MS = 1000;
const ACTIVE_QRIS_KEY = "nfpos_active_qris";

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

async function waitForPaymentStatus(
  paymentId: string,
  signal: AbortSignal,
  onRetry: (message: string) => void
) {
  while (!signal.aborted) {
    await wait(PAYMENT_POLL_INTERVAL_MS, signal);

    try {
      const response = await api.get<PaymentStatus>(
        `/api/payments/${paymentId}`,
        { signal }
      );
      const status = response.data.status;

      onRetry("");

      if (
        status === "paid" ||
        status === "failed" ||
        status === "expired"
      ) {
        return status;
      }

      if (status !== "pending" && status !== "creating") {
        throw new Error(`Status pembayaran tidak dikenali: ${status}`);
      }
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      onRetry(
        "Status belum dapat diperbarui. Sistem akan mencoba lagi."
      );
    }
  }

  throw new DOMException("Aborted", "AbortError");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function paymentFromStatus(status: PaymentStatus): QrisPayment {
  return {
    id: status.id,
    transactionId: status.transactionId,
    providerPaymentRequestId: status.providerPaymentRequestId,
    providerReferenceId: status.providerReferenceId,
    amount: status.amount,
    currency: status.currency,
    status: status.status,
    qrString: status.qrString,
    expiresAt: status.expiresAt,
  };
}

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

  const [paymentCapabilities, setPaymentCapabilities] =
    useState<PaymentCapabilities>({
      qrisEnabled: false,
      mode: "disabled",
      isSandbox: false,
    });

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
  const [cashSuccess, setCashSuccess] = useState<{
    transactionId: string;
    transactionNumber: string;
    amount: number;
    method: string;
  } | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [qrisPayment, setQrisPayment] =
    useState<QrisPayment | null>(null);
  const [qrisStatus, setQrisStatus] =
    useState<string | null>(null);
  const [qrisStatusError, setQrisStatusError] =
    useState("");
  const [qrisCancelling, setQrisCancelling] = useState(false);

  const submissionLock = useRef(false);
  const checkoutAbort = useRef<AbortController | null>(null);

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
    // Initial data and payment recovery are intentionally run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      checkoutAbort.current?.abort();
    },
    []
  );

  async function loadInitial() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        productResponse,
        customerResponse,
        settingsResponse,
        capabilitiesResponse,
      ] = await Promise.all([
        api.get<Product[]>("/api/products"),
        api.get<Customer[]>("/api/customers"),
        api.get<Settings>("/api/settings"),
        api.get<PaymentCapabilities>(
          "/api/payments/capabilities"
        ),
      ]);

      setAllProducts(productResponse.data);
      setCustomers(customerResponse.data);
      setSettings(settingsResponse.data);
      setPaymentCapabilities(capabilitiesResponse.data);
      setPaymentMethod((current) =>
        current === "qris" &&
        !capabilitiesResponse.data.qrisEnabled
          ? "tunai"
          : current
      );
      setTax(
        clampPercent(Number(
          settingsResponse.data.defaultTax ?? 0
        ))
      );

      if (capabilitiesResponse.data.qrisEnabled) {
        await restoreQrisPayment();
      }
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

  function persistPayment(payment: QrisPayment) {
    localStorage.setItem(ACTIVE_QRIS_KEY, JSON.stringify(payment));
  }

  function removePersistedPayment() {
    localStorage.removeItem(ACTIVE_QRIS_KEY);
  }

  async function restoreQrisPayment() {
    try {
      const saved = localStorage.getItem(ACTIVE_QRIS_KEY);
      let status: PaymentStatus | null = null;

      if (saved) {
        const parsed = JSON.parse(saved) as QrisPayment;
        const response = await api.get<PaymentStatus>(
          `/api/payments/${parsed.id}`
        );
        status = response.data;
      } else {
        const response = await api.get<PaymentStatus | "">(
          "/api/payments/current"
        );
        status = response.status === 204 || !response.data
          ? null
          : response.data as PaymentStatus;
      }

      if (!status) return;

      const payment = paymentFromStatus(status);
      persistPayment(payment);
      setQrisPayment(payment);
      setQrisStatus(status.status);
      setQrisStatusError("");
      await restoreSaleContext(payment.transactionId);

      if (status.status === "paid") {
        clearCart();
        await Promise.all([
          loadReceipt(payment.transactionId),
          reloadProducts(),
        ]);
      } else if (
        status.status === "pending" ||
        status.status === "creating"
      ) {
        void monitorPayment(payment);
      }
    } catch (error) {
      setQrisStatusError(
        `Pembayaran sebelumnya belum dapat dipulihkan. ${getErrorMessage(error)}`
      );
    }
  }

  async function restoreSaleContext(transactionId: string) {
    const { data } = await api.get<TransactionResponse & {
      customerId: string | null;
      disc: number;
      tax: number;
    }>(`/api/transactions/${transactionId}`);
    setCart(data.items.map((item) => ({ ...item })));
    setCustomerId(data.customerId ?? "");
    setDiscount(clampPercent(data.disc));
    setTax(clampPercent(data.tax));
    setPaymentMethod("qris");
  }

  async function loadReceipt(transactionId: string) {
    setReceipt(null);
    setReceiptLoading(true);
    setReceiptError("");
    try {
      const { data } = await api.get<TransactionResponse>(
        `/api/transactions/${transactionId}`
      );
      setReceipt({
        transactionId: data.id,
        transactionDate: data.createdAt ?? new Date().toISOString(),
        noTrx: data.noTrx,
        subtotal: data.subtotal,
        discAmt: data.discAmt,
        taxAmt: data.taxAmt,
        total: data.total,
        dibayar: data.dibayar,
        kembalian: data.kembalian,
        metodePembayaran: data.metodePembayaran,
        items: data.items,
      });
    } catch (error) {
      setReceiptError(
        `Pembayaran sudah berhasil, tetapi detail struk belum dapat dimuat. ${getErrorMessage(error)}`
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  async function applyFinalPaymentStatus(
    payment: QrisPayment,
    status: string
  ) {
    setQrisStatus((current) => current === "paid" ? current : status);
    persistPayment({ ...payment, status });

    if (status === "paid") {
      clearCart();
      await Promise.all([
        loadReceipt(payment.transactionId),
        reloadProducts(),
      ]);
    }
  }

  async function cancelQrisPayment() {
    if (!qrisPayment || qrisCancelling) return;
    if (!window.confirm(
      `Batalkan QRIS ${qrisPayment.providerPaymentRequestId}? Kode ini tidak dapat dipakai lagi.`
    )) return;

    setQrisCancelling(true);
    setQrisStatusError("");
    try {
      checkoutAbort.current?.abort();
      const { data } = await api.post<PaymentStatus>(
        `/api/payments/${qrisPayment.id}/cancel`
      );
      const restored = paymentFromStatus(data);
      setQrisPayment(restored);
      setQrisStatus(data.status);
      persistPayment(restored);
      await restoreSaleContext(restored.transactionId);
    } catch (error) {
      setQrisStatusError(
        `Pembatalan belum terkonfirmasi. Jangan buat pembayaran baru. ${getErrorMessage(error)}`
      );
      await refreshPaymentStatus();
    } finally {
      setQrisCancelling(false);
    }
  }

  async function monitorPayment(payment: QrisPayment) {
    checkoutAbort.current?.abort();
    const abortController = new AbortController();
    checkoutAbort.current = abortController;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const status = await waitForPaymentStatus(
        payment.id,
        abortController.signal,
        setQrisStatusError
      );
      await applyFinalPaymentStatus(payment, status);
    } catch (error) {
      if (!abortController.signal.aborted) {
        setQrisStatusError(getErrorMessage(error));
      }
    } finally {
      if (checkoutAbort.current === abortController) {
        checkoutAbort.current = null;
        submissionLock.current = false;
        setSubmitting(false);
      }
    }
  }

  async function refreshPaymentStatus() {
    if (!qrisPayment) return;
    setQrisStatusError("");
    try {
      const { data } = await api.get<PaymentStatus>(
        `/api/payments/${qrisPayment.id}`
      );
      const restored = paymentFromStatus(data);
      setQrisPayment(restored);
      await applyFinalPaymentStatus(restored, data.status);
      if (data.status === "pending" || data.status === "creating") {
        void monitorPayment(restored);
      }
    } catch (error) {
      setQrisStatusError(getErrorMessage(error));
    }
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

  function requestClearCart() {
    const unitCount = cart.reduce(
      (sum, item) => sum + item.qty,
      0
    );

    if (
      unitCount > 0 &&
      !window.confirm(
        `Kosongkan ${unitCount} item dari keranjang?`
      )
    ) {
      return;
    }

    clearCart();
  }

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.subtotal,
        0
      ),
    [cart]
  );

  const cartQuantityById = useMemo(
    () =>
      new Map(
        cart.map((item) => [item.id, item.qty])
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
  const totalsValid =
    Number.isFinite(discount) &&
    Number.isFinite(tax) &&
    discount >= 0 && discount <= 100 &&
    tax >= 0 && tax <= 100 &&
    Number.isFinite(total) && total >= 0;

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
    if (
      submissionLock.current ||
      submitting ||
      cart.length === 0
    ) {
      return;
    }

    const stockError = validateStock();

    if (stockError) {
      window.alert(stockError);
      return;
    }

    if (!totalsValid) {
      window.alert("Diskon, pajak, atau total transaksi tidak valid.");
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

    submissionLock.current = true;
    setSubmitting(true);
    setReceipt(null);
    setReceiptError("");

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

      if (paymentMethod === "qris") {
        if (!paymentCapabilities.qrisEnabled) {
          throw new Error("Pembayaran QRIS sedang tidak tersedia.");
        }

        const paymentResponse = await api.post<QrisPayment>(
          "/api/payments/qris",
          {
            ...payload,
            metodePembayaran: "QRIS",
            dibayar: 0,
            kembalian: 0,
          }
        );
        const payment = paymentResponse.data;

        persistPayment(payment);
        setQrisPayment(payment);
        setQrisStatus(payment.status);
        setQrisStatusError("");
        await monitorPayment(payment);
        return;
      }

      const response = await api.post<TransactionResponse>(
        "/api/transactions",
        payload
      );

      setReceipt({
        transactionId: response.data.id,
        transactionDate: response.data.createdAt ?? new Date().toISOString(),
        noTrx: response.data.noTrx,
        subtotal: response.data.subtotal,
        discAmt: response.data.discAmt,
        taxAmt: response.data.taxAmt,
        total: response.data.total,
        dibayar: response.data.dibayar,
        kembalian: response.data.kembalian,
        metodePembayaran: response.data.metodePembayaran,
        items: response.data.items ?? receiptItems,
      });

      setCashSuccess({
        transactionId: response.data.id,
        transactionNumber: response.data.noTrx,
        amount: response.data.total,
        method: response.data.metodePembayaran,
      });
      clearCart();

      await reloadProducts();
    } catch (error) {
      if (checkoutAbort.current?.signal.aborted) {
        return;
      }

      window.alert(getErrorMessage(error));

      try {
        await reloadProducts();
      } catch {
        // Error checkout utama sudah ditampilkan.
      }
    } finally {
      checkoutAbort.current = null;
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  function closeFailedQris() {
    removePersistedPayment();
    setQrisPayment(null);
    setQrisStatus(null);
    setQrisStatusError("");
  }

  function startNewTransaction() {
    removePersistedPayment();
    setQrisPayment(null);
    setQrisStatus(null);
    setQrisStatusError("");
    setReceipt(null);
    setReceiptError("");
    setCashSuccess(null);
    setReceiptOpen(false);
  }

  return (
    <AppShell>
      <section className="content-section active transaction-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Kasir
            </h2>

            <p className="section-sub">
              Point of Sale
            </p>
          </div>

        </div>

        {qrisStatusError && !qrisPayment ? (
          <div className="payment-recovery-banner" role="alert">
            <strong>Pembayaran sebelumnya belum dapat diperiksa.</strong>
            <span>{qrisStatusError}</span>
            <button type="button" className="btn-secondary" onClick={() => void restoreQrisPayment()}>
              Coba Lagi
            </button>
          </div>
        ) : null}

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
              onIncrease={increase}
              onDecrease={decrease}
              quantityById={cartQuantityById}
            />

            <CartPanel
              submitting={
                submitting || qrisStatus === "pending"
              }
              items={cart}
              customers={customers}
              customerId={customerId}
              discount={discount}
              tax={tax}
              subtotal={subtotal}
              total={total}
              paymentMethod={paymentMethod}
              qrisEnabled={paymentCapabilities.qrisEnabled}
              qrisSandbox={paymentCapabilities.isSandbox}
              paid={paid}
              change={change}
              totalsValid={totalsValid}
              onCustomerChange={setCustomerId}
              onDiscountChange={(value) => setDiscount(clampPercent(value))}
              onTaxChange={(value) => setTax(clampPercent(value))}
              onPaymentMethodChange={
                setPaymentMethod
              }
              onPaidChange={setPaid}
              onIncrease={increase}
              onDecrease={decrease}
              onRemove={remove}
              onClear={requestClearCart}
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

        <PaymentSuccessModal
          open={cashSuccess !== null}
          method={cashSuccess?.method ?? "tunai"}
          amount={cashSuccess?.amount ?? 0}
          transactionNumber={cashSuccess?.transactionNumber ?? ""}
          transactionId={cashSuccess?.transactionId ?? ""}
          onViewReceipt={() => {
            setCashSuccess(null);
            setReceiptOpen(true);
          }}
          onNewTransaction={startNewTransaction}
        />

        <QrisPaymentModal
          payment={qrisPayment}
          status={qrisStatus}
          statusError={qrisStatusError}
          sandbox={paymentCapabilities.isSandbox}
          onCloseFailed={closeFailedQris}
          onRetryStatus={() => void refreshPaymentStatus()}
          receiptLoading={receiptLoading}
          receiptError={receiptError}
          receiptReady={
            receipt?.transactionId === qrisPayment?.transactionId &&
            !receiptLoading && !receiptError
          }
          cancelling={qrisCancelling}
          onCancel={() => void cancelQrisPayment()}
          onRetryReceipt={() => {
            if (qrisPayment) {
              void loadReceipt(qrisPayment.transactionId);
            }
          }}
          onViewReceipt={() => {
            removePersistedPayment();
            setQrisPayment(null);
            setQrisStatus(null);
            setReceiptOpen(true);
          }}
          onNewTransaction={startNewTransaction}
        />
      </section>
    </AppShell>
  );
}
